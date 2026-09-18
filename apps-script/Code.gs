/* Adicione Core.js e Catalogo.gs ao MESMO projeto Apps Script. */
var HEADERS = {
  Eventos: ['EventoID','Nome','Data','Local','Horario','Status','Abertura','Encerramento','LimiteTotal','LimitePorMunicipio'],
  Funcoes: ['EventoID','FuncaoID','Nome','Tipo','NTE','Limite','GrupoVagas','Ativa','Setor'],
  MunicipiosNTE: ['Municipio','NTE'],
  Inscricoes: ['InscricaoID','EventoID','EventoNome','DataHora','Nome','CPF','Telefone','Email','FuncaoID','Funcao','Tipo','Municipio','NTE','GrupoVagas','Status','ChaveRequisicao','DadosRequisicao'],
  Vagas: ['EventoID','Evento','GrupoVagas','Limite','Inscritos','Disponiveis']
};
/* Prazo acordado: os dois eventos encerram em 05/10 as 23:59 (America/Bahia).
   O segundo 59 mantem o minuto 23:59 inteiro dentro do prazo.
   Abertura fica em branco de proposito: preencha-a e mude Status para ABERTO ao liberar. */
/* LimiteTotal acompanha a soma das cotas do evento (271 no EPT, 265 no EJA, que nao recebe
   a linha de professores de EPT). Um teto menor que a soma bloquearia inscricoes com vaga livre. */
var EVENTOS_PADRAO = [
  ['ept','EPT','2026-10-07','','','RASCUNHO','','2026-10-05T23:59:59-03:00',271,1],
  ['eja','EJA','2026-10-08','','','RASCUNHO','','2026-10-05T23:59:59-03:00',265,1]
];
/* Colunas acrescentadas depois da primeira versao: ausentes em planilhas antigas, lidas como vazias. */
var COLUNAS_OPCIONAIS = { Funcoes: ['Setor'] };
function database_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID ausente');
  return SpreadsheetApp.openById(id);
}
function table_(name) {
  var sheet = database_().getSheetByName(name);
  if (!sheet) throw new Error('Aba ausente: ' + name);
  var values = sheet.getDataRange().getDisplayValues();
  var header = values.shift();
  HEADERS[name].forEach(function (h) { if (header.indexOf(h) < 0 && (COLUNAS_OPCIONAIS[name] || []).indexOf(h) < 0) throw new Error('Coluna ausente: ' + h); });
  return values.filter(function (r) { return r.some(function (v) { return v !== ''; }); }).map(function (row) {
    var record = {};
    header.forEach(function (h,i) { record[h] = row[i]; });
    return record;
  });
}
function number_(v) { return String(v).trim() === '' ? NaN : Number(v); }
function config_() {
  var config = {
    eventos: table_('Eventos').map(function (r) { return { id:r.EventoID, nome:r.Nome, data:r.Data, local:r.Local, horario:r.Horario, status:r.Status, abertura:r.Abertura, encerramento:r.Encerramento, limite:number_(r.LimiteTotal), limiteMunicipio:number_(r.LimitePorMunicipio) }; }),
    funcoes: table_('Funcoes').map(function (r) { return { eventoId:r.EventoID, id:r.FuncaoID, nome:r.Nome, tipo:r.Tipo, nte:r.NTE, limite:number_(r.Limite), grupo:r.GrupoVagas, ativa:r.Ativa === 'SIM', setor:r.Setor || '' }; }),
    municipios: table_('MunicipiosNTE').map(function (r) { return { nome:r.Municipio, nte:r.NTE }; })
  };
  var ids = {};
  config.eventos.forEach(function (e) { if (!e.id || ids[e.id]) throw new Error('EventoID duplicado ou ausente'); ids[e.id] = true; });
  return config;
}
function registrations_() {
  return table_('Inscricoes').map(function (r) { return { id:r.InscricaoID, eventoId:r.EventoID, eventoNome:r.EventoNome, cpf:r.CPF, funcaoId:r.FuncaoID, grupoVagas:r.GrupoVagas, municipio:r.Municipio, tipo:r.Tipo, status:r.Status, requestId:r.ChaveRequisicao, canonical:r.DadosRequisicao }; });
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return json_({ success:false, code:'METHOD_NOT_ALLOWED', message:'Use a integração do site.' }); }
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 10000) return json_({ success:false, code:'INVALID_INPUT', message:'Envio inválido.' });
    var payload = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
    if (!secret || secret.length < 32 || payload.secret !== secret) return json_({ success:false, code:'UNAUTHORIZED', message:'Integração não autorizada.' });
    if (payload.action === 'config') {
      var config = config_(), rows = registrations_();
      return json_({ success:true, eventos:config.eventos.map(function (event) { return RegistrationCore.publicEvent(event, config.funcoes, rows, Date.now()); }), municipios:config.municipios.map(function (m) { return m.nome; }) });
    }
    if (payload.action !== 'inscrever') return json_({ success:false, code:'INVALID_ACTION', message:'Ação inválida.' });
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return json_({ success:false, code:'BUSY', message:'Há outros envios em andamento. Tente novamente em instantes.' });
    try {
      // Releitura dentro do bloqueio é obrigatória para conferir a última vaga.
      var result = RegistrationCore.prepare(payload.data || {}, config_(), registrations_(), Date.now());
      if (result.existing) return json_({ success:true, protocolo:result.existing.id, evento:result.existing.eventoNome });
      var r = result.record;
      r.id = Utilities.getUuid();
      var values = { InscricaoID:r.id, EventoID:r.eventoId, EventoNome:r.eventoNome,
        DataHora:Utilities.formatDate(new Date(), 'America/Bahia', "yyyy-MM-dd'T'HH:mm:ssXXX"), Nome:r.nome,
        CPF:r.cpf, Telefone:r.telefone, Email:r.email, FuncaoID:r.funcaoId, Funcao:r.funcao,
        Tipo:r.tipo, Municipio:r.municipio, NTE:r.nte, GrupoVagas:r.grupoVagas, Status:r.status,
        ChaveRequisicao:r.requestId, DadosRequisicao:r.canonical };
      var sheet = database_().getSheetByName('Inscricoes');
      var header = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      // Prefixo de texto impede fórmulas e preserva zeros iniciais.
      var row = header.map(function (h) { return values[h] === undefined ? '' : "'" + String(values[h]); });
      sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setNumberFormat('@').setValues([row]);
      SpreadsheetApp.flush();
      return json_({ success:true, protocolo:r.id, evento:r.eventoNome });
    } finally { lock.releaseLock(); }
  } catch (error) {
    // Não devolver exceções internas nem dados pessoais.
    return json_({ success:false, code:error.code || 'INTERNAL_ERROR', message:error.code ? error.message : 'Não foi possível processar a solicitação. Tente novamente.' });
  }
}
function prepararPlanilha() {
  var ss = database_();
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 0) return; // Nunca sobrescrever configuração existente.
    sheet = sheet || ss.insertSheet(name);
    sheet.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold').setBackground('#1a3a8a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1,HEADERS[name].length,160);
    if (name === 'Eventos') {
      sheet.getRange(2,1,EVENTOS_PADRAO.length,10).setNumberFormat('@').setValues(EVENTOS_PADRAO);
    }
    if (name === 'Funcoes') {
      var roles = [];
      ['ept','eja'].forEach(function (id) { CATALOGO_FUNCOES.forEach(function (f) {
        if (f.eventos && f.eventos.indexOf(id) < 0) return;
        roles.push([id,f.id,f.nome,f.tipo,f.nte || '',f.limite || 0,f.grupo || f.id,'SIM',f.setor || '']);
      }); });
      sheet.getRange(2,1,roles.length,9).setValues(roles);
    }
    if (name === 'MunicipiosNTE') {
      sheet.getRange(2,1,CATALOGO_MUNICIPIOS.length,2).setValues(CATALOGO_MUNICIPIOS.map(function (m) { return [m.nome,m.nte]; }));
    }
  });
}
function atualizarPainelVagas() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var config = config_(), rows = registrations_(), data = [];
    config.eventos.forEach(function (e) {
      var active = rows.filter(function (r) { return r.eventoId === e.id && r.status === 'CONFIRMADA'; });
      data.push([e.id,e.nome,'TOTAL DO EVENTO',e.limite,active.length,Math.max(0,e.limite-active.length)]);
      var seen = {};
      config.funcoes.filter(function (f) { return f.eventoId === e.id && f.ativa; }).forEach(function (f) {
        var group = f.grupo || f.id;
        if (seen[group]) return;
        seen[group] = true;
        var used = active.filter(function (r) { return r.grupoVagas === group; }).length;
        data.push([e.id,e.nome,group,f.limite,used,Math.max(0,Math.min(f.limite-used,e.limite-active.length))]);
      });
    });
    var sheet = database_().getSheetByName('Vagas');
    if (sheet.getLastRow()>1) sheet.getRange(2,1,sheet.getLastRow()-1,6).clearContent();
    if (data.length) sheet.getRange(2,1,data.length,6).setValues(data);
  } finally { lock.releaseLock(); }
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Inscrições EPT / EJA').addItem('Preparar estrutura (preserva dados)', 'prepararPlanilha').addItem('Atualizar painel de vagas', 'atualizarPainelVagas').addToUi();
}
