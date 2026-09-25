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
  var escritos = anotarRegistros_(pendentes);
  if (escritos.length) supabaseFetch_('/rpc/marcar_planilha', { method: 'post', body: { p_secret: segredoSinc_(), p_protocolos: escritos } });
  return escritos.length;
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
    var enviadas = anotarInscricoesPendentes_();
    Logger.log('Supabase: config ' + JSON.stringify(config) + ' | inscrições enviadas: ' + enviadas);
    return { config: config, enviadas: enviadas };
  } finally { lock.releaseLock(); }
}

/* Dispara quando alguém edita a planilha: as vagas chegam ao Supabase em segundos. */
function aoEditarPlanilha() {
  try { sincronizarConfigParaSupabase(); } catch (erro) { Logger.log('Sincronização na edição falhou: ' + erro); }
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
