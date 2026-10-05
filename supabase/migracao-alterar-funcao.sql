-- Permite alterar a função de uma inscrição existente.
-- Usado quando alguém edita manualmente a aba Inscricoes na planilha.
-- Verifica se a nova função tem vaga disponível antes de alterar.

create or replace function alterar_funcao_inscricao(
  p_secret text,
  p_protocolo text,
  p_nova_funcao_id text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_inscricao inscricoes%rowtype;
  v_nova_funcao funcoes%rowtype;
  v_evento eventos%rowtype;
  v_total bigint;
  v_usadas bigint;
  v_grupo text;
begin
  -- Verifica o segredo
  if p_secret is null or p_secret <> (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;

  -- Busca a inscrição
  select * into v_inscricao from inscricoes where protocolo = p_protocolo;
  if not found then
    return jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Inscrição não encontrada.');
  end if;

  -- Não faz nada se a função é a mesma
  if v_inscricao.funcao_id = p_nova_funcao_id then
    return jsonb_build_object('success', true, 'message', 'Função já é a mesma.');
  end if;

  -- Busca a nova função
  select * into v_nova_funcao from funcoes where evento_id = v_inscricao.evento_id and id = p_nova_funcao_id and ativa;
  if not found then
    return jsonb_build_object('success', false, 'code', 'INVALID_ROLE', 'message', 'Função não encontrada ou inativa.');
  end if;

  -- Busca o evento
  select * into v_evento from eventos where id = v_inscricao.evento_id;

  -- Verifica se a nova função tem vaga (descontando a própria inscrição que será movida)
  v_grupo := coalesce(v_nova_funcao.grupo_vagas, v_nova_funcao.id);

  select count(*) into v_total from inscricoes
   where evento_id = v_inscricao.evento_id and status = 'CONFIRMADA';
  if v_total >= v_evento.limite_total then
    return jsonb_build_object('success', false, 'code', 'SOLD_OUT', 'message', 'As vagas deste evento foram preenchidas.');
  end if;

  select count(*) into v_usadas from inscricoes
   where evento_id = v_inscricao.evento_id and status = 'CONFIRMADA' and grupo_vagas = v_grupo;
  -- Desconta a própria inscrição se ela já está neste grupo
  if v_inscricao.grupo_vagas = v_grupo then
    v_usadas := v_usadas - 1;
  end if;
  if v_usadas >= v_nova_funcao.limite then
    return jsonb_build_object('success', false, 'code', 'ROLE_SOLD_OUT', 'message', 'As vagas desta função foram preenchidas.');
  end if;

  -- Verifica limite municipal se for função municipal
  if v_nova_funcao.tipo = 'MUNICIPAL' and v_inscricao.municipio is not null and v_inscricao.municipio <> '' then
    select count(*) into v_usadas from inscricoes
     where evento_id = v_inscricao.evento_id and status = 'CONFIRMADA'
       and tipo = 'MUNICIPAL' and municipio = v_inscricao.municipio;
    if v_inscricao.tipo = 'MUNICIPAL' and v_inscricao.municipio = v_inscricao.municipio then
      v_usadas := v_usadas - 1;
    end if;
    if v_usadas >= v_evento.limite_municipio then
      return jsonb_build_object('success', false, 'code', 'MUNICIPALITY_SOLD_OUT', 'message', 'Este município já atingiu seu limite.');
    end if;
  end if;

  -- Atualiza a inscrição com a nova função
  update inscricoes set
    funcao_id = v_nova_funcao.id,
    funcao_nome = case
      when coalesce(v_nova_funcao.setor, '') = '' then v_nova_funcao.nome
      when left(v_nova_funcao.nome, length(v_nova_funcao.setor) + 1) = v_nova_funcao.setor || '/' then v_nova_funcao.nome
      else v_nova_funcao.setor || '/' || v_nova_funcao.nome
    end,
    tipo = v_nova_funcao.tipo,
    setor = coalesce(v_nova_funcao.setor, ''),
    nte = case when v_nova_funcao.tipo = 'NTE' then v_nova_funcao.nte else '' end,
    grupo_vagas = v_grupo
  where protocolo = p_protocolo;

  return jsonb_build_object('success', true, 'message', 'Função alterada com sucesso.');
end; $$;

grant execute on function alterar_funcao_inscricao(text, text, text) to anon, authenticated;

-- Lista as funções atuais de uma lista de inscrições.
-- Usada pelo Apps Script para detectar mudanças de função na planilha.
create or replace function listar_funcoes_inscricoes(
  p_secret text,
  p_protocolos text[]
) returns table (protocolo text, funcao_id text)
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select valor from app_config where chave = 'sync_secret') then
    return;
  end if;
  return query
    select i.protocolo, i.funcao_id
    from inscricoes i
    where i.protocolo = any(p_protocolos);
end; $$;

grant execute on function listar_funcoes_inscricoes(text, text[]) to anon, authenticated;
