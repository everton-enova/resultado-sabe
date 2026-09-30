-- Recadastro depois de apagar a linha: rode uma vez no SQL Editor do Supabase.
-- Apagar a linha na planilha marca a inscricao como REMOVIDA, mas o CPF continuava preso a
-- ela e a nova inscricao da mesma pessoa voltava "Este CPF ja possui uma inscricao".
-- Agora so inscricoes vivas (nem REMOVIDA nem CANCELADA) ocupam o CPF no evento.
-- Pode rodar de novo sem efeito colateral.

-- Remove a restricao antiga unique (evento_id, cpf), qualquer que seja o nome dela.
do $$
declare r record;
begin
  for r in select c.conname from pg_constraint c
            where c.conrelid = 'inscricoes'::regclass and c.contype = 'u'
              and (select array_agg(a.attname::text order by a.attname) from pg_attribute a
                    where a.attrelid = c.conrelid and a.attnum = any(c.conkey)) = array['cpf', 'evento_id']
  loop
    execute format('alter table inscricoes drop constraint %I', r.conname);
  end loop;
end $$;
create unique index if not exists inscricoes_cpf_ativo_idx on inscricoes (evento_id, cpf)
  where status not in ('REMOVIDA', 'CANCELADA');

create or replace function inscrever(
  p_evento_id text,
  p_nome      text,
  p_cpf       text,
  p_telefone  text,
  p_email     text,
  p_funcao_id text,
  p_municipio text,
  p_chave     text,
  p_canonical text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_evento   eventos%rowtype;
  v_role     funcoes%rowtype;
  v_exist    inscricoes%rowtype;
  v_estado   text;
  v_grupo    text;
  v_total    bigint;
  v_used     bigint;
  v_nome     text;
  v_protocolo text;
begin
  -- Serializa por evento: contagens e inserção enxergam o mesmo estado.
  perform pg_advisory_xact_lock(hashtext('inscricoes:' || p_evento_id));

  select * into v_evento from eventos where id = p_evento_id;
  if not found then
    return jsonb_build_object('success', false, 'code', 'INVALID_EVENT', 'message', 'Selecione um evento válido.');
  end if;

  -- Reenvio com a mesma chave: devolve o protocolo já gravado.
  select * into v_exist from inscricoes where chave_requisicao = p_chave;
  if found then
    if v_exist.canonical <> p_canonical then
      return jsonb_build_object('success', false, 'code', 'REQUEST_CONFLICT', 'message', 'Este envio foi alterado. Atualize a página e tente novamente.');
    end if;
    return jsonb_build_object('success', true, 'protocolo', v_exist.protocolo, 'evento', v_evento.nome,
      'registro', jsonb_build_object('protocolo', v_exist.protocolo, 'eventoId', v_exist.evento_id,
        'eventoNome', v_evento.nome, 'nome', v_exist.nome, 'cpf', v_exist.cpf, 'telefone', v_exist.telefone,
        'email', v_exist.email, 'funcaoId', v_exist.funcao_id, 'funcao', v_exist.funcao_nome,
        'setor', v_exist.setor, 'tipo', v_exist.tipo, 'municipio', v_exist.municipio, 'nte', v_exist.nte,
        'grupoVagas', v_exist.grupo_vagas, 'status', v_exist.status,
        'chave', v_exist.chave_requisicao, 'canonical', v_exist.canonical));
  end if;

  if v_evento.limite_total is null or v_evento.limite_total <= 0
     or v_evento.limite_municipio is null or v_evento.limite_municipio <= 0
     or v_evento.abertura is null or v_evento.encerramento is null
     or v_evento.encerramento <= v_evento.abertura then
    v_estado := 'FECHADO';
  elsif v_evento.status <> 'ABERTO' then
    v_estado := 'FECHADO';
  elsif now() < v_evento.abertura then
    v_estado := 'EM_BREVE';
  elsif now() >= v_evento.encerramento then
    v_estado := 'ENCERRADO';
  else
    v_estado := 'ABERTO';
  end if;
  if v_estado <> 'ABERTO' then
    return jsonb_build_object('success', false, 'code', 'EVENT_CLOSED', 'message', 'As inscrições deste evento não estão abertas.');
  end if;

  if exists (select 1 from inscricoes where evento_id = p_evento_id and cpf = p_cpf
             and status not in ('REMOVIDA', 'CANCELADA')) then
    return jsonb_build_object('success', false, 'code', 'DUPLICATE_CPF', 'message', 'Este CPF já possui uma inscrição neste evento.');
  end if;

  select * into v_role from funcoes where evento_id = p_evento_id and id = p_funcao_id and ativa;
  if not found then
    return jsonb_build_object('success', false, 'code', 'INVALID_ROLE', 'message', 'Selecione uma função válida para este evento.');
  end if;
  if v_role.limite is null or v_role.limite < 0 then
    return jsonb_build_object('success', false, 'code', 'CONFIG_ERROR', 'message', 'As vagas deste evento estão em configuração.');
  end if;

  if v_role.tipo = 'MUNICIPAL' then
    if not exists (select 1 from municipios where nome = p_municipio) then
      return jsonb_build_object('success', false, 'code', 'INVALID_MUNICIPALITY', 'message', 'Selecione um município válido.');
    end if;
  elsif coalesce(p_municipio, '') <> '' then
    return jsonb_build_object('success', false, 'code', 'INVALID_INPUT', 'message', 'Revise o município para a função selecionada.');
  end if;

  v_grupo := coalesce(v_role.grupo_vagas, v_role.id);

  select count(*) into v_total from inscricoes where evento_id = p_evento_id and status = 'CONFIRMADA';
  if v_total >= v_evento.limite_total then
    return jsonb_build_object('success', false, 'code', 'SOLD_OUT', 'message', 'As vagas deste evento foram preenchidas.');
  end if;

  select count(*) into v_used from inscricoes where evento_id = p_evento_id and status = 'CONFIRMADA' and grupo_vagas = v_grupo;
  if v_used >= v_role.limite then
    return jsonb_build_object('success', false, 'code', 'ROLE_SOLD_OUT', 'message', 'As vagas desta função foram preenchidas.');
  end if;

  if v_role.tipo = 'MUNICIPAL' then
    select count(*) into v_used from inscricoes where evento_id = p_evento_id and status = 'CONFIRMADA' and municipio = p_municipio;
    if v_used >= v_evento.limite_municipio then
      return jsonb_build_object('success', false, 'code', 'MUNICIPALITY_SOLD_OUT', 'message', 'Este município já atingiu seu limite de representantes.');
    end if;
  end if;

  -- Nome exibido no painel: setor/nome, sem duplicar quando já vem prefixado.
  if coalesce(v_role.setor, '') = '' then
    v_nome := v_role.nome;
  elsif left(v_role.nome, length(v_role.setor) + 1) = v_role.setor || '/' then
    v_nome := v_role.nome;
  else
    v_nome := v_role.setor || '/' || v_role.nome;
  end if;

  v_protocolo := protocolo_livre();
  insert into inscricoes (protocolo, evento_id, nome, cpf, telefone, email, funcao_id, funcao_nome,
    municipio, nte, setor, tipo, grupo_vagas, chave_requisicao, canonical)
  values (v_protocolo, p_evento_id, p_nome, p_cpf, p_telefone, p_email, p_funcao_id, v_nome,
    coalesce(p_municipio, ''), case when v_role.tipo = 'NTE' then v_role.nte else '' end,
    coalesce(v_role.setor, ''), v_role.tipo, v_grupo, p_chave, p_canonical);

  return jsonb_build_object('success', true, 'protocolo', v_protocolo, 'evento', v_evento.nome,
    'registro', jsonb_build_object('protocolo', v_protocolo, 'eventoId', p_evento_id,
      'eventoNome', v_evento.nome, 'nome', p_nome, 'cpf', p_cpf, 'telefone', p_telefone,
      'email', p_email, 'funcaoId', p_funcao_id, 'funcao', v_nome, 'setor', coalesce(v_role.setor, ''),
      'tipo', v_role.tipo, 'municipio', coalesce(p_municipio, ''),
      'nte', case when v_role.tipo = 'NTE' then v_role.nte else '' end,
      'grupoVagas', v_grupo, 'status', 'CONFIRMADA', 'chave', p_chave, 'canonical', p_canonical));
end; $$;

create or replace function sincronizar_inscricoes(p_secret text, p_registros jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inseridos int := 0;
  atualizados int := 0;
begin
  if p_secret is null or p_secret <> (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  with dados as (
    select x.protocolo, x.evento_id, x.nome, x.cpf, x.telefone, x.email, x.funcao_id, x.funcao_nome,
           coalesce(nullif(x.chave, ''), x.protocolo) as chave, coalesce(x.canonical, '') as canonical,
           coalesce(x.nte, '') as nte, coalesce(x.municipio, '') as municipio,
           coalesce(nullif(x.status, ''), 'CONFIRMADA') as status, coalesce(x.grupo_vagas, '') as grupo_vagas
    from jsonb_to_recordset(coalesce(p_registros, '[]'::jsonb)) as x(
      protocolo text, evento_id text, nome text, cpf text, telefone text, email text, funcao_id text,
      funcao_nome text, municipio text, grupo_vagas text, status text, chave text, canonical text, nte text)
    where coalesce(x.protocolo, '') <> '' and coalesce(x.evento_id, '') <> '' and coalesce(x.funcao_id, '') <> ''
  )
  insert into inscricoes (protocolo, evento_id, nome, cpf, telefone, email, funcao_id, funcao_nome,
    municipio, nte, setor, tipo, grupo_vagas, status, chave_requisicao, canonical, planilha_status)
  select d.protocolo, d.evento_id, coalesce(d.nome, ''), coalesce(d.cpf, ''), coalesce(d.telefone, ''),
    coalesce(d.email, ''), d.funcao_id, coalesce(d.funcao_nome, ''), d.municipio, coalesce(f.nte, d.nte),
    coalesce(f.setor, ''), coalesce(f.tipo, 'INSTITUCIONAL'),
    coalesce(nullif(d.grupo_vagas, ''), f.grupo_vagas, d.funcao_id),
    d.status, d.chave, d.canonical, 'ENVIADA'
  from dados d left join funcoes f on f.evento_id = d.evento_id and f.id = d.funcao_id
  on conflict do nothing;
  get diagnostics inseridos = row_count;

  with dados as (
    select x.protocolo, nullif(x.nome, '') as nome, nullif(x.telefone, '') as telefone,
           nullif(x.email, '') as email, nullif(x.status, '') as status
    from jsonb_to_recordset(coalesce(p_registros, '[]'::jsonb)) as x(
      protocolo text, nome text, telefone text, email text, status text)
    where coalesce(x.protocolo, '') <> ''
  )
  update inscricoes i
  set nome = coalesce(d.nome, i.nome), telefone = coalesce(d.telefone, i.telefone),
      email = coalesce(lower(d.email), i.email), status = coalesce(d.status, i.status)
  from dados d
  where i.protocolo = d.protocolo
    -- Linha apagada e depois colada de volta na aba volta a valer, a nao ser que o CPF ja
    -- tenha se inscrito de novo: reativar a antiga violaria o indice e travaria o lote todo.
    and not (coalesce(d.status, i.status) not in ('REMOVIDA', 'CANCELADA')
             and exists (select 1 from inscricoes o where o.evento_id = i.evento_id and o.cpf = i.cpf
                           and o.id <> i.id and o.status not in ('REMOVIDA', 'CANCELADA')));
  get diagnostics atualizados = row_count;

  return jsonb_build_object('success', true, 'inseridos', inseridos, 'atualizados', atualizados);
end; $$;
