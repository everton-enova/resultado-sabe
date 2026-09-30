-- Migracao: apagar a linha na planilha passa a cancelar a inscricao.
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem medo.

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
      -- Sem isto, marcar tudo como PENDENTE para repovoar a aba traria de volta
      -- justamente as linhas que alguem removeu de proposito.
      and i.status = 'CONFIRMADA'
      and p_secret = (select valor from app_config where chave = 'sync_secret')
    order by i.criado_em
    limit greatest(1, least(coalesce(p_limite, 50), 200))
  ) t;
$$;

-- Marca as inscricoes confirmadas para voltarem a aba na proxima sincronizacao. Serve quando a
-- planilha ficou para tras do banco. Nao duplica: anotarRegistros_ pula protocolo que ja esta la.
create or replace function repovoar_planilha(p_secret text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total int := 0;
begin
  if p_secret is distinct from (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;
  update inscricoes set planilha_status = 'PENDENTE' where status = 'CONFIRMADA';
  get diagnostics v_total = row_count;
  return jsonb_build_object('success', true, 'marcadas', v_total);
end; $$;

-- Apagar a linha na planilha passa a valer como cancelamento: o que sumiu da aba sai da
-- contagem de vagas. Tres travas, porque uma remocao indevida em massa e irreversivel na pratica:
--   1. Lista vazia nao remove nada. Aba renomeada, ilegivel ou recem-limpa nao vira exclusao geral.
--   2. So entram inscricoes JA escritas na aba (planilha_status <> 'PENDENTE'). Sem isso, uma
--      inscricao feita ha segundos, ainda a caminho da planilha, seria removida por estar ausente.
--   3. Acima do teto nada e tocado e o numero volta para quem chamou, para uma pessoa decidir.
-- A linha nao e destruida: vira REMOVIDA, o que ja libera a vaga e preserva o historico.
create or replace function remover_ausentes(p_secret text, p_protocolos jsonb, p_teto int default 25)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ausentes int := 0;
  v_teto int := greatest(1, coalesce(p_teto, 25));
  v_lista text[];
begin
  if p_secret is distinct from (select valor from app_config where chave = 'sync_secret') then
    return jsonb_build_object('success', false, 'code', 'UNAUTHORIZED');
  end if;
  if p_protocolos is null or jsonb_typeof(p_protocolos) <> 'array' or jsonb_array_length(p_protocolos) = 0 then
    return jsonb_build_object('success', false, 'code', 'PLANILHA_VAZIA');
  end if;

  select array_agg(t.valor) into v_lista from jsonb_array_elements_text(p_protocolos) as t(valor);

  select count(*) into v_ausentes from inscricoes i
   where i.status = 'CONFIRMADA' and i.planilha_status <> 'PENDENTE'
     and not (i.protocolo = any(v_lista));

  if v_ausentes = 0 then
    return jsonb_build_object('success', true, 'removidas', 0);
  end if;
  if v_ausentes > v_teto then
    return jsonb_build_object('success', false, 'code', 'EXCESSO', 'ausentes', v_ausentes, 'teto', v_teto);
  end if;

  update inscricoes i set status = 'REMOVIDA'
   where i.status = 'CONFIRMADA' and i.planilha_status <> 'PENDENTE'
     and not (i.protocolo = any(v_lista));

  return jsonb_build_object('success', true, 'removidas', v_ausentes);
end; $$;

grant execute on function remover_ausentes(text,jsonb,int) to anon, authenticated;
grant execute on function repovoar_planilha(text) to anon, authenticated;
