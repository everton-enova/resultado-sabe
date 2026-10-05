/* Ponte entre a planilha e o Supabase.
   O site fala direto com o Supabase (rápido). Este arquivo faz os dois sentidos:
   a planilha empurra a configuração (Eventos/Vagas/Municípios) e puxa as inscrições
   que o site já gravou, para elas aparecerem aqui em tempo quase real.
   Cola este arquivo no editor do Apps Script junto com os demais. */
var SUPABASE_URL_PADRAO = 'https://yabpqnvnodhyhmolkdao.supabase.co';
var SUPABASE_ANON_PADRAO = 'sb_publishable_D4XIgZPeSIUxH0HSw6VgSw_-VUdB5X3';

/* Rode uma vez pelo editor (Executar > configurarSupabase) para gravar as propriedades. */
function configurarSupabase() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SUPABASE_URL')) props.setProperty('SUPABASE_URL', SUPABASE_URL_PADRAO);
  if (!props.getProperty('SUPABASE_ANON_KEY')) props.setProperty('SUPABASE_ANON_KEY', SUPABASE_ANON_PADRAO);
  var segredo = props.getProperty('API_SECRET');
  Logger.log('Propriedades gravadas. No SQL Editor do Supabase rode:');
  Logger.log("update app_config set valor = '" + (segredo || '(rode mostrarSegredo primeiro)') + "' where chave = 'sync_secret';");
  return true;
}

function supabaseProp_(nome) {
  var valor = PropertiesService.getScriptProperties().getProperty(nome);
  if (!valor) throw new Error(nome + ' ausente nas propriedades do script. Rode configurarSupabase().');
  return valor;
}
/* O mesmo valor de API_SECRET protege as funções de sincronização no Supabase. */
function segredoSinc_() { return supabaseProp_('API_SECRET'); }

function supabaseFetch_(caminho, opcoes) {
  var url = supabaseProp_('SUPABASE_URL').replace(/\/+$/, '');
  var chave = supabaseProp_('SUPABASE_ANON_KEY');
  var params = { method: (opcoes && opcoes.method) || 'get', contentType: 'application/json',
    headers: { apikey: chave, Authorization: 'Bearer ' + chave }, muteHttpExceptions: true };
  if (opcoes && opcoes.body) params.payload = JSON.stringify(opcoes.body);
  var resposta = UrlFetchApp.fetch(url + '/rest/v1' + caminho, params);
  var codigo = resposta.getResponseCode();
  var texto = resposta.getContentText();
  if (codigo >= 300) throw new Error('Supabase ' + codigo + ': ' + texto);
  return texto ? JSON.parse(texto) : null;
}

/* Configuração da planilha convertida para o formato das tabelas do Supabase. */
function configParaSupabase_() {
  var c = config_();
  return {
    eventos: c.eventos.map(function (e) { return { id: e.id, nome: e.nome, data: e.data || '', local: e.local || '',
      horario: e.horario || '', status: e.status || 'FECHADO', abertura: e.abertura || '', encerramento: e.encerramento || '',
      limite_total: isFinite(e.limite) ? e.limite : 0, limite_municipio: isFinite(e.limiteMunicipio) ? e.limiteMunicipio : 0 }; }),
    funcoes: c.funcoes.map(function (f) { return { evento_id: f.eventoId, id: f.id, nome: f.nome, tipo: f.tipo,
      nte: f.nte || '', setor: f.setor || '', grupo_vagas: f.grupo || f.id,
      limite: isFinite(f.limite) ? f.limite : 0, ativa: !!f.ativa }; }),
    // Lê a aba direto: config_() só carrega municípios quando existe função municipal.
    municipios: table_('MunicipiosNTE').map(function (r) { return { nome: r.Municipio, nte: r.NTE }; })
  };
}

function sincronizarConfigParaSupabase() {
  var dados = configParaSupabase_();
  return supabaseFetch_('/rpc/sincronizar_config', { method: 'post', body: {
    p_secret: segredoSinc_(), p_eventos: dados.eventos, p_funcoes: dados.funcoes, p_municipios: dados.municipios } });
}

/* Grava na aba Inscricoes os registros recebidos, sem duplicar pelo protocolo. */
function anotarRegistros_(registros) {
  var sheet = database_().getSheetByName('Inscricoes');
  if (!sheet) throw new Error('Aba Inscricoes ausente');
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var colunaId = header.indexOf('InscricaoID'), existentes = {};
  if (colunaId >= 0 && sheet.getLastRow() > 1) {
    sheet.getRange(2, colunaId + 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) { existentes[r[0]] = true; });
  }
  var linhas = [], escritos = [];
  (registros || []).forEach(function (r) {
    if (!r || !r.protocolo || existentes[r.protocolo]) return;
    existentes[r.protocolo] = true;
    var values = { InscricaoID: r.protocolo, EventoID: r.eventoId, Evento: r.eventoNome,
      'Data/Hora': Utilities.formatDate(new Date(), 'America/Bahia', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      Nome: r.nome, CPF: r.cpf, Telefone: r.telefone, 'E-mail': r.email, FuncaoID: r.funcaoId, Funcao: r.funcao,
      Setor: r.setor, Tipo: r.tipo, Municipio: r.municipio, NTE: r.nte, GrupoVagas: r.grupoVagas,
      Status: r.status, ChaveRequisicao: r.chave, DadosRequisicao: r.canonical };
    linhas.push(header.map(function (h) { return values[h] === undefined ? '' : "'" + String(values[h]); }));
    escritos.push(r.protocolo);
  });
  if (linhas.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, linhas.length, header.length).setNumberFormat('@').setValues(linhas);
    SpreadsheetApp.flush();
  }
  return escritos;
}

function anotarInscricoesPendentes_() {
  var pendentes = supabaseFetch_('/rpc/listar_pendentes', { method: 'post', body: { p_secret: segredoSinc_(), p_limite: 100 } });
  if (!pendentes || !pendentes.length) return 0;
  anotarRegistros_(pendentes);
  // Marca todas como enviadas: as que já estavam na aba também, para não reprocessar toda hora.
  var protocolos = pendentes.map(function (r) { return r.protocolo; });
  supabaseFetch_('/rpc/marcar_planilha', { method: 'post', body: { p_secret: segredoSinc_(), p_protocolos: protocolos } });
  return protocolos.length;
}

/* Espelha a aba Inscricoes de volta para o Supabase: linhas criadas à mão e ajustes de
   nome/telefone/e-mail/status feitos na planilha. Casa pelo protocolo (InscricaoID). */
function sincronizarInscricoesPlanilha_() {
  var registros = table_('Inscricoes').map(function (r) { return {
    protocolo: r.InscricaoID, evento_id: r.EventoID, nome: r.Nome, cpf: r.CPF, telefone: r.Telefone,
    email: r['E-mail'], funcao_id: r.FuncaoID, funcao_nome: r.Funcao, municipio: r.Municipio || '',
    grupo_vagas: r.GrupoVagas, status: r.Status, chave: r.ChaveRequisicao, canonical: r.DadosRequisicao, nte: r.NTE }; });
  var total = { inseridos: 0, atualizados: 0, protocolos: [] };
  registros.forEach(function (r) { var p = String(r.protocolo || '').trim(); if (p) total.protocolos.push(p); });
  for (var i = 0; i < registros.length; i += 200) {
    var resultado = supabaseFetch_('/rpc/sincronizar_inscricoes', { method: 'post',
      body: { p_secret: segredoSinc_(), p_registros: registros.slice(i, i + 200) } });
    if (resultado && resultado.success) { total.inseridos += resultado.inseridos || 0; total.atualizados += resultado.atualizados || 0; }
  }
  return total;
}

/* Apagar a linha na planilha vale como cancelamento. Quem decide e o banco: mandamos os
   protocolos que a aba tem e ele remove o que sobrou, dentro das travas de remover_ausentes.
   Lista vazia nem sai daqui — aba ilegivel nunca pode virar exclusao geral. Teto 0 e previa:
   so conta, nunca remove. */
function removerAusentes_(protocolos, teto) {
  if (!protocolos || !protocolos.length) return { success: false, code: 'PLANILHA_VAZIA' };
  return supabaseFetch_('/rpc/remover_ausentes', { method: 'post',
    body: { p_secret: segredoSinc_(), p_protocolos: protocolos, p_teto: teto == null ? 25 : teto } });
}

function protocolosDaAba_() {
  return table_('Inscricoes').map(function (r) { return String(r.InscricaoID || '').trim(); })
    .filter(function (p) { return p; });
}

/* Atalho de menu: só a ida planilha → Supabase. */
function enviarInscricoesParaSupabase() {
  var resultado = sincronizarInscricoesPlanilha_();
  Logger.log('Planilha → Supabase: ' + JSON.stringify(resultado));
  return resultado;
}

/* Migração (roda uma vez): leva para o Supabase as inscrições que já estão na planilha,
   preservando protocolo e CPF e marcando como já enviadas. Pode rodar de novo: não duplica. */
function importarInscricoesParaSupabase() {
  var registros = table_('Inscricoes').map(function (r) { return {
    protocolo: r.InscricaoID, evento_id: r.EventoID, nome: r.Nome, cpf: r.CPF, telefone: r.Telefone,
    email: r['E-mail'], funcao_id: r.FuncaoID, funcao_nome: r.Funcao, grupo_vagas: r.GrupoVagas,
    status: r.Status, chave: r.ChaveRequisicao, canonical: r.DadosRequisicao, nte: r.NTE }; });
  var semChave = registros.filter(function (r) { return !r.protocolo || !r.evento_id || !r.funcao_id; }).length;
  var total = 0;
  for (var i = 0; i < registros.length; i += 200) {
    var resultado = supabaseFetch_('/rpc/importar_inscricoes', { method: 'post',
      body: { p_secret: segredoSinc_(), p_registros: registros.slice(i, i + 200) } });
    if (resultado && resultado.success) total += (resultado.inseridos || 0);
  }
  Logger.log('Importação para o Supabase: ' + total + ' nova(s) de ' + registros.length + ' na planilha.');
  if (semChave) Logger.log('Atenção: ' + semChave + ' linha(s) sem Protocolo/EventoID/FuncaoID não puderam ser importadas. Confira as colunas InscricaoID, EventoID e FuncaoID da aba Inscricoes.');
  return total;
}

/* Sincronização completa. É o que o gatilho chama. */
function sincronizarSupabase() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var config = sincronizarConfigParaSupabase();
    if (config && config.success === false && config.code === 'UNAUTHORIZED') {
      Logger.log('O segredo do Supabase ainda não foi alinhado. Copie a linha abaixo, cole no SQL Editor do Supabase e execute; depois rode esta função de novo:');
      Logger.log("update app_config set valor = '" + segredoSinc_() + "' where chave = 'sync_secret';");
      return { config: config, enviadas: 0, conserto: 'update app_config set valor = ' + segredoSinc_() + " where chave = 'sync_secret'" };
    }
    var inscricoes = sincronizarInscricoesPlanilha_();
    var removidas = removerAusentes_(inscricoes.protocolos);
    if (removidas && removidas.code === 'EXCESSO') {
      Logger.log('Exclusao em massa barrada: ' + removidas.ausentes + ' inscricoes do banco nao estao na aba, ' +
        'acima do teto de ' + removidas.teto + '. Nada foi removido. Se a aba estiver incompleta, ' +
        'restaure-a antes; se as exclusoes forem mesmo intencionais, rode removerAusentesAgora() e confirme.');
    }
    var enviadas = anotarInscricoesPendentes_();
    // As pendentes acabaram de entrar na aba Inscricoes: reflete nos painéis sem esperar o
    // gatilho de cinco minutos. Falha aqui não desfaz a sincronização já concluída.
    if (enviadas) try { var c = config_(), r = registrations_(); painelVagas_(c, r); monitoramento_(c, r); } catch (erro) { Logger.log('Atualização dos painéis falhou: ' + erro); }
    Logger.log('Supabase: config ' + JSON.stringify(config) + ' | planilha→Supabase ' + JSON.stringify(inscricoes) +
      ' | removidas ' + JSON.stringify(removidas) + ' | Supabase→planilha ' + enviadas);
    return { config: config, inscricoes: inscricoes, removidas: removidas, enviadas: enviadas };
  } finally { lock.releaseLock(); }
}

/* Dispara quando alguém edita a planilha: as vagas chegam ao Supabase em segundos
   e os painéis (Vagas/Monitoramento) são atualizados na hora. */
function aoEditarPlanilha() {
  try {
    sincronizarConfigParaSupabase();
    var c = config_(), r = registrations_();
    painelVagas_(c, r);
    monitoramento_(c, r);
  } catch (erro) { Logger.log('Sincronização na edição falhou: ' + erro); }
}

/* Traz de volta para a aba as inscricoes confirmadas que so existem no banco. Use quando a
   planilha ficou para tras — nao duplica o que ja esta la. A aba se repovoa em alguns ciclos,
   porque cada um traz ate 100. */
function recarregarInscricoesDoSupabase() {
  // Mesmo lock da anotacao vinda do site: sem ele, as duas escritas leem a aba ao mesmo tempo e
  // o mesmo protocolo entra duas vezes.
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var r = supabaseFetch_('/rpc/repovoar_planilha', { method: 'post', body: { p_secret: segredoSinc_() } });
    Logger.log('Marcadas para voltar a planilha: ' + JSON.stringify(r));
    var trazidas = anotarInscricoesPendentes_();
    Logger.log('Trazidas agora: ' + trazidas + '. Rode de novo, ou aguarde a sincronizacao de 1 minuto, ate zerar.');
    return { marcadas: r, trazidas: trazidas };
  } finally { lock.releaseLock(); }
}

/* Escape manual para quando a exclusao em massa e mesmo intencional: o ciclo automatico barra
   acima do teto de proposito, e aqui uma pessoa confirma o numero antes de remover. */
function removerAusentesAgora() {
  var previa = removerAusentes_(sincronizarInscricoesPlanilha_().protocolos, 0);
  if (previa && previa.success) { Logger.log('Nada a remover: a aba ja bate com o banco.'); return previa; }
  if (!previa || previa.code !== 'EXCESSO') { Logger.log('Resposta inesperada: ' + JSON.stringify(previa)); return previa; }
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.alert('Remover inscricoes ausentes',
    previa.ausentes + ' inscricoes estao no banco e nao estao na aba Inscricoes.\n\n' +
    'Confirme que a aba esta completa antes de seguir: se ela estiver desatualizada, use ' +
    '"Recarregar inscricoes do Supabase" em vez disto.\n\nRemover as ' + previa.ausentes + '?',
    ui.ButtonSet.YES_NO);
  if (resposta !== ui.Button.YES) { Logger.log('Cancelado por quem executou.'); return { success: false, code: 'CANCELADO' }; }
  // A pergunta pode ficar minutos aberta. A lista e relida sob o lock, para que uma inscricao
  // anotada pelo site nesse meio-tempo conte como presente, e o teto e o numero confirmado:
  // se a conta mudou, nada e removido.
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var r = removerAusentes_(protocolosDaAba_(), previa.ausentes);
    Logger.log('Removidas: ' + JSON.stringify(r));
    return r;
  } finally { lock.releaseLock(); }
}

/* Gatilho de 1 minuto (rede de segurança) + onChange (quase instantâneo). */
function criarGatilhosSupabase() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'sincronizarSupabase' || f === 'aoEditarPlanilha') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarSupabase').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('aoEditarPlanilha').forSpreadsheet(database_()).onChange().create();
}
