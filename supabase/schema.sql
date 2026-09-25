-- Estrutura do Supabase para as inscrições EPT/EJA.
-- A planilha continua sendo o lugar onde a equipe edita Eventos/Vagas; ela sincroniza para cá.
-- O site lê daqui (rápido) e cada inscrição entra aqui antes de aparecer na planilha.

-- ---------------------------------------------------------------------------
-- Tabelas de configuração (espelho da planilha)
-- ---------------------------------------------------------------------------
create table if not exists eventos (
  id               text primary key,
  nome             text not null,
  data             text default '',
  local            text default '',
  horario          text default '',
  status           text not null default 'FECHADO',
  abertura         timestamptz,
  encerramento     timestamptz,
  limite_total     int not null default 0,
  limite_municipio int not null default 0
);

create table if not exists funcoes (
  evento_id   text not null references eventos(id) on delete cascade,
  id          text not null,
  nome        text not null,
  tipo        text not null check (tipo in ('INSTITUCIONAL','MUNICIPAL','NTE')),
  nte         text default '',
  setor       text default '',
  grupo_vagas text,
  limite      int,
  ativa       boolean not null default true,
  primary key (evento_id, id)
);

create table if not exists municipios (
  nome text primary key,
  nte  text default ''
);

-- Segredo compartilhado com o Apps Script (nunca exposto ao site).
create table if not exists app_config (
  chave text primary key,
  valor text not null
);
insert into app_config (chave, valor) values ('sync_secret', 'TROQUE_ESTE_SEGREDO_PELO_APP_SCRIPT')
  on conflict (chave) do nothing;

-- ---------------------------------------------------------------------------
-- Inscrições (fonte da verdade)
-- ---------------------------------------------------------------------------
create table if not exists inscricoes (
  id               bigint generated always as identity primary key,
  protocolo        text unique not null,
  evento_id        text not null references eventos(id),
  nome             text not null,
  cpf              text not null,
  telefone         text not null,
  email            text not null,
  funcao_id        text not null,
  funcao_nome      text not null default '',
  municipio        text default '',
  nte              text default '',
  setor            text default '',
  tipo             text not null,
  grupo_vagas      text not null,
  status           text not null default 'CONFIRMADA',
  chave_requisicao text unique not null,
  canonical        text not null,
  planilha_status  text not null default 'PENDENTE',
  criado_em        timestamptz not null default now(),
  unique (evento_id, cpf)
);

create index if not exists inscricoes_evento_idx  on inscricoes (evento_id, status);
create index if not exists inscricoes_grupo_idx   on inscricoes (evento_id, grupo_vagas, status);
create index if not exists inscricoes_municipio_idx on inscricoes (evento_id, municipio, status);
create index if not exists inscricoes_planilha_idx on inscricoes (planilha_status, criado_em);

-- ---------------------------------------------------------------------------
-- Protocolo curto (K7R2-9DQ), no mesmo espírito do Apps Script.
-- ---------------------------------------------------------------------------
create or replace function protocolo_livre() returns text
language plpgsql as $$
declare
  letras constant text := 'ABCDEFGHJKLMNPRSTUVWXYZ';
  chars  text[] := array[]::text[];
  code   text;
  i int;
  j int;
  tmp text;
begin
  for tentativa in 1..50 loop
    chars := array[]::text[];
    for i in 1..4 loop
      chars := chars || substr(letras, 1 + floor(random()*length(letras))::int, 1);
    end loop;
    for i in 1..3 loop
      chars := chars || floor(random()*10)::text;
    end loop;
    for i in reverse 7..2 loop
      j := 1 + floor(random()*i)::int;
      tmp := chars[i]; chars[i] := chars[j]; chars[j] := tmp;
    end loop;
    code := chars[1]||chars[2]||chars[3]||chars[4]||'-'||chars[5]||chars[6]||chars[7];
    if not exists (select 1 from inscricoes where protocolo = code) then
      return code;
    end if;
  end loop;
  return substr(md5(random()::text || clock_timestamp()::text), 1, 8);
end; $$;

-- ---------------------------------------------------------------------------
-- Inscrição atômica: mesma regra do Core.js, sem corrida na última vaga.
-- ---------------------------------------------------------------------------
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

  if exists (select 1 from inscricoes where evento_id = p_evento_id and cpf = p_cpf) then
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

-- ---------------------------------------------------------------------------
-- Leitura pública: contagens agregadas, sem dado pessoal.
-- ---------------------------------------------------------------------------
create or replace function contagens_vagas()
returns table (evento_id text, grupo_vagas text, municipio text, total bigint)
language sql security definer set search_path = public as $$
  select i.evento_id, i.grupo_vagas, coalesce(i.municipio, ''), count(*)
  from inscricoes i
  where i.status = 'CONFIRMADA'
  group by i.evento_id, i.grupo_vagas, coalesce(i.municipio, '');
$$;

-- ---------------------------------------------------------------------------
-- Sincronização com a planilha (Apps Script)
-- ---------------------------------------------------------------------------
create or replace function sincronizar_config(
  p_secret text, p_eventos jsonb, p_funcoes jsonb, p_municipios jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  insert into eventos (id, nome, data, local, horario, status, abertura, encerramento, limite_total, limite_municipio)
  select x.id, x.nome, coalesce(x.data,''), coalesce(x.local,''), coalesce(x.horario,''), coalesce(x.status,'FECHADO'),
         nullif(x.abertura,'')::timestamptz, nullif(x.encerramento,'')::timestamptz,
         coalesce(x.limite_total, 0), coalesce(x.limite_municipio, 0)
  from jsonb_to_recordset(coalesce(p_eventos, '[]'::jsonb)) as x(
    id text, nome text, data text, local text, horario text, status text,
    abertura text, encerramento text, limite_total int, limite_municipio int)
  on conflict (id) do update set
    nome = excluded.nome, data = excluded.data, local = excluded.local, horario = excluded.horario,
    status = excluded.status, abertura = excluded.abertura, encerramento = excluded.encerramento,
    limite_total = excluded.limite_total, limite_municipio = excluded.limite_municipio;

  delete from funcoes f
  where f.evento_id in (select y.id from jsonb_to_recordset(coalesce(p_eventos,'[]'::jsonb)) as y(id text))
    and not exists (
      select 1 from jsonb_to_recordset(coalesce(p_funcoes,'[]'::jsonb)) as z(evento_id text, id text)
      where z.evento_id = f.evento_id and z.id = f.id);

  insert into funcoes (evento_id, id, nome, tipo, nte, setor, grupo_vagas, limite, ativa)
  select x.evento_id, x.id, x.nome, x.tipo, coalesce(x.nte,''), coalesce(x.setor,''),
         x.grupo_vagas, coalesce(x.limite, 0), coalesce(x.ativa, true)
  from jsonb_to_recordset(coalesce(p_funcoes,'[]'::jsonb)) as x(
    evento_id text, id text, nome text, tipo text, nte text, setor text, grupo_vagas text, limite int, ativa boolean)
  on conflict (evento_id, id) do update set
    nome = excluded.nome, tipo = excluded.tipo, nte = excluded.nte, setor = excluded.setor,
    grupo_vagas = excluded.grupo_vagas, limite = excluded.limite, ativa = excluded.ativa;

  delete from municipios m
  where not exists (
    select 1 from jsonb_to_recordset(coalesce(p_municipios,'[]'::jsonb)) as y(nome text)
    where y.nome = m.nome);

  insert into municipios (nome, nte)
  select x.nome, coalesce(x.nte,'')
  from jsonb_to_recordset(coalesce(p_municipios,'[]'::jsonb)) as x(nome text, nte text)
  on conflict (nome) do update set nte = excluded.nte;

  return jsonb_build_object('success', true);
end; $$;

-- Inscrições confirmadas que ainda não foram para a planilha.
create or replace function listar_pendentes(p_secret text, p_limite int default 50)
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
    select i.protocolo, i.evento_id as "eventoId", e.nome as "eventoNome",
           to_char(i.criado_em at time zone 'America/Bahia', 'YYYY-MM-DD"T"HH24:MI:SS') as "dataHora",
           i.nome, i.cpf, i.telefone, i.email, i.funcao_id as "funcaoId", i.funcao_nome as "funcao",
           i.setor, i.tipo, i.municipio, i.nte, i.grupo_vagas as "grupoVagas", i.status,
           i.chave_requisicao as "chave", i.canonical
    from inscricoes i join eventos e on e.id = i.evento_id
    where i.planilha_status = 'PENDENTE'
      and p_secret = (select valor from app_config where chave = 'sync_secret')
    order by i.criado_em
    limit greatest(1, least(coalesce(p_limite, 50), 200))
  ) t;
$$;

-- Importa para o Supabase as inscrições que já existiam na planilha (uma vez, na migração).
-- Preserva protocolo/CPF e marca como já enviadas, para não duplicar na planilha.
create or replace function importar_inscricoes(p_secret text, p_registros jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inseridos int := 0;
begin
  if p_secret is null or p_secret <> (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  with dados as (
    select x.protocolo, x.evento_id, x.nome, x.cpf, x.telefone, x.email, x.funcao_id, x.funcao_nome,
           coalesce(nullif(x.chave, ''), x.protocolo) as chave, coalesce(x.canonical, '') as canonical,
           coalesce(x.nte, '') as nte, coalesce(x.status, 'CONFIRMADA') as status,
           coalesce(x.grupo_vagas, '') as grupo_vagas
    from jsonb_to_recordset(coalesce(p_registros, '[]'::jsonb)) as x(
      protocolo text, evento_id text, nome text, cpf text, telefone text, email text, funcao_id text,
      funcao_nome text, grupo_vagas text, status text, chave text, canonical text, nte text)
    where coalesce(x.protocolo, '') <> '' and coalesce(x.evento_id, '') <> '' and coalesce(x.funcao_id, '') <> ''
  )
  insert into inscricoes (protocolo, evento_id, nome, cpf, telefone, email, funcao_id, funcao_nome,
    municipio, nte, setor, tipo, grupo_vagas, status, chave_requisicao, canonical, planilha_status)
  select d.protocolo, d.evento_id, coalesce(d.nome, ''), coalesce(d.cpf, ''), coalesce(d.telefone, ''),
    coalesce(d.email, ''), d.funcao_id, coalesce(d.funcao_nome, ''), '', coalesce(f.nte, d.nte),
    coalesce(f.setor, ''), coalesce(f.tipo, 'INSTITUCIONAL'),
    coalesce(nullif(d.grupo_vagas, ''), f.grupo_vagas, d.funcao_id),
    d.status, d.chave, d.canonical, 'ENVIADA'
  from dados d left join funcoes f on f.evento_id = d.evento_id and f.id = d.funcao_id
  on conflict do nothing;
  get diagnostics inseridos = row_count;

  return jsonb_build_object('success', true, 'inseridos', inseridos);
end; $$;

create or replace function marcar_planilha(p_secret text, p_protocolos jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;
  update inscricoes
  set planilha_status = 'ENVIADA'
  where protocolo in (select jsonb_array_elements_text(coalesce(p_protocolos, '[]'::jsonb)));
  return jsonb_build_object('success', true);
end; $$;

-- ---------------------------------------------------------------------------
-- Permissões: site lê configuração e chama as funções públicas; nada de acesso
-- direto às inscrições.
-- ---------------------------------------------------------------------------
grant select on eventos, funcoes, municipios to anon, authenticated;
grant execute on function contagens_vagas() to anon, authenticated;
grant execute on function inscrever(text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function sincronizar_config(text,jsonb,jsonb,jsonb) to anon, authenticated;
grant execute on function listar_pendentes(text,int) to anon, authenticated;
grant execute on function marcar_planilha(text,jsonb) to anon, authenticated;
grant execute on function importar_inscricoes(text,jsonb) to anon, authenticated;

alter table eventos    enable row level security;
alter table funcoes    enable row level security;
alter table municipios enable row level security;
alter table inscricoes enable row level security;
alter table app_config  enable row level security;

drop policy if exists eventos_leitura on eventos;
create policy eventos_leitura on eventos for select using (true);
drop policy if exists funcoes_leitura on funcoes;
create policy funcoes_leitura on funcoes for select using (true);
drop policy if exists municipios_leitura on municipios;
create policy municipios_leitura on municipios for select using (true);
