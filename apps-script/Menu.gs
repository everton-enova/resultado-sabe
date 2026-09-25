/* Projeto dividido em arquivos curtos de proposito: o editor do Apps Script trunca
   colagem longa. Todos compartilham o mesmo escopo global, a ordem nao importa. */
/* Menu da planilha: preparar estrutura, atualizar paineis, gatilho e segredo. */
function prepararPlanilha() {
  var ss = database_(), criadas = [], semDados = [];
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 0) return; // Nunca sobrescrever configuração existente.
    sheet = sheet || ss.insertSheet(name);
    criadas.push(name);
    sheet.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold').setBackground('#1a3a8a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1,HEADERS[name].length,160);
    if (name === 'Eventos') {
      sheet.getRange(2,1,EVENTOS_PADRAO.length,10).setNumberFormat('@').setValues(EVENTOS_PADRAO);
    }
    // Catalogo.gs tambem e opcional: sem ele a aba nasce so com o cabecalho e as cotas sao
    // preenchidas a mao ou coladas. O site le tudo da planilha, entao nada disso o afeta.
    if (name === 'Funcoes' && typeof CATALOGO_FUNCOES !== 'undefined' && CATALOGO_FUNCOES.length) {
      var roles = [];
      ['ept','eja'].forEach(function (id) { CATALOGO_FUNCOES.forEach(function (f) {
        var limite = f.limites ? f.limites[id] : f.limite;
        roles.push([id,f.id,f.nome,f.tipo,f.nte || '',limite || 0,f.grupo || f.id,'SIM',f.setor || '']);
      }); });
      sheet.getRange(2,1,roles.length,9).setValues(roles);
    }
    // Municipios.gs e opcional: sem ele a aba nasce so com o cabecalho, e o site nao usa
    // municipio enquanto nao houver funcao do tipo MUNICIPAL.
    if (name === 'MunicipiosNTE' && typeof CATALOGO_MUNICIPIOS !== 'undefined' && CATALOGO_MUNICIPIOS.length) {
      sheet.getRange(2,1,CATALOGO_MUNICIPIOS.length,2).setValues(CATALOGO_MUNICIPIOS.map(function (m) { return [m.nome,m.nte]; }));
    }
    if (name === 'Funcoes' && typeof CATALOGO_FUNCOES === 'undefined') semDados.push('Funcoes (falta Catalogo.gs)');
    if (name === 'MunicipiosNTE' && typeof CATALOGO_MUNICIPIOS === 'undefined') semDados.push('MunicipiosNTE (falta Municipios.gs)');
  });
  Logger.log(criadas.length ? 'Abas criadas: ' + criadas.join(', ') : 'Nada a criar: as abas ja existiam.');
  if (semDados.length) Logger.log('Criadas so com o cabecalho: ' + semDados.join('; '));
}
function montarMonitoramento() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { monitoramento_(config_(), registrations_()); } finally { lock.releaseLock(); }
}
function atualizarPainelVagas() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { var c = config_(), r = registrations_(); painelVagas_(c, r); monitoramento_(c, r); } finally { lock.releaseLock(); }
}
/* Gatilho de um minuto como rede de seguranca; a atualizacao imediata acontece a cada inscricao. */
function criarGatilhos() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'atualizarPainelVagas') ScriptApp.deleteTrigger(t);
  });
  // Cinco minutos: a atualizacao que importa acontece na propria inscricao; este gatilho so
  // cobre edicao manual da planilha, e de minuto em minuto ele competia com o site.
  ScriptApp.newTrigger('atualizarPainelVagas').timeBased().everyMinutes(5).create();
}
/* Gera o segredo da integracao e ja grava em API_SECRET, para nao depender de terminal.
   Rode pelo editor do Apps Script (Executar) e leia o valor no registro de execucao.
   Nao vira item de menu de proposito: quem abre a planilha nao deveria ver o segredo. */
function mostrarSegredo() {
  var props = PropertiesService.getScriptProperties();
  var segredo = props.getProperty('API_SECRET');
  var novo = !segredo || segredo.length < 32;
  if (novo) {
    // Dois UUID sem hifen: 64 caracteres hexadecimais de origem aleatoria.
    segredo = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('API_SECRET', segredo);
  }
  Logger.log((novo ? 'Segredo criado e salvo em API_SECRET.' : 'API_SECRET ja existia; reaproveitando.') +
    ' Copie o valor abaixo para APPS_SCRIPT_SECRET na Vercel:');
  Logger.log(segredo);
  return segredo;
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Inscrições EPT / EJA').addItem('Preparar estrutura (preserva dados)', 'prepararPlanilha').addItem('Atualizar painel de vagas', 'atualizarPainelVagas').addItem('Montar painel de monitoramento', 'montarMonitoramento').addItem('Ativar atualizacao automatica', 'criarGatilhos').addSeparator().addItem('Configurar Supabase', 'configurarSupabase').addItem('Sincronizar Supabase agora', 'sincronizarSupabase').addItem('Ativar sincronizacao com Supabase', 'criarGatilhosSupabase').addToUi();
}
