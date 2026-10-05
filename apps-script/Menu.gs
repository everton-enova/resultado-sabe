/* Menu simplificado: apenas 3 opções essenciais.
   Tudo mais é automático - editar a planilha já dispara a sincronização. */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Inscrições')
    .addItem('⚙️ Configurar (primeira vez)', 'configurarTudo')
    .addItem('🔄 Sincronizar agora', 'sincronizarAgora')
    .addItem('❓ Ajuda', 'mostrarAjuda')
    .addToUi();
}

/* Configuração inicial: prepara abas, cria gatilhos e configura Supabase.
   Rodar apenas uma vez na primeira vez. */
function configurarTudo() {
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.alert(
    'Configuração inicial',
    'Isso vai preparar as abas e ativar a sincronização automática.\n\n' +
    'Seus dados existentes serão preservados.\n\n' +
    'Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (resposta !== ui.Button.YES) return;
  
  // 1. Prepara as abas (preserva dados existentes)
  prepararPlanilha();
  
  // 2. Cria os gatilhos automáticos
  criarGatilhos();
  criarGatilhosSupabase();
  
  // 3. Gera o segredo se não existir
  mostrarSegredo();
  
  // 4. Sincroniza uma primeira vez
  sincronizarSupabase();
  
  ui.alert(
    'Configuração concluída!',
    'A sincronização automática está ativa.\n\n' +
    'Agora é só editar a planilha - tudo atualiza sozinho:\n' +
    '• Editar aba "Vagas" → atualiza monitoramento e formulário\n' +
    '• Editar aba "Inscricoes" → atualiza vagas e monitoramento\n' +
    '• Editar aba "Eventos" → atualiza datas e status\n\n' +
    'Se precisar forçar uma sincronização, use "Sincronizar agora" no menu.',
    ui.ButtonSet.OK
  );
}

/* Sincronização manual: força uma sincronização completa. */
function sincronizarAgora() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('Sincronizando...', 'Aguarde um momento.', ui.ButtonSet.OK);
  
  try {
    sincronizarSupabase();
    ui.alert('Concluído!', 'Sincronização finalizada com sucesso.', ui.ButtonSet.OK);
  } catch (erro) {
    ui.alert('Erro', 'Falha na sincronização: ' + erro.message, ui.ButtonSet.OK);
  }
}

/* Ajuda: mostra como funciona. */
function mostrarAjuda() {
  SpreadsheetApp.getUi().alert(
    'Como funciona',
    'SINCRONIZAÇÃO AUTOMÁTICA\n\n' +
    '• Editar aba "Vagas" → atualiza monitoramento e formulário\n' +
    '• Editar aba "Inscricoes" → atualiza vagas e monitoramento\n' +
    '• Editar aba "Eventos" → atualiza datas e status\n' +
    '• Editar aba "Funcoes" → atualiza limites\n\n' +
    'TUDO ATUALIZA SOZINHO - não precisa clicar em nada!\n\n' +
    'Se algo não atualizar, use "Sincronizar agora" no menu.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/* Cria os gatilhos automáticos para atualização dos painéis. */
function criarGatilhos() {
  var ss = database_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'atualizarPainelVagas' || h === 'aoEditarVagas') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('atualizarPainelVagas').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('aoEditarVagas').forSpreadsheet(ss).onEdit().create();
}

/* Cria os gatilhos para sincronização com o Supabase. */
function criarGatilhosSupabase() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'sincronizarSupabase' || f === 'aoEditarPlanilha') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarSupabase').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('aoEditarPlanilha').forSpreadsheet(database_()).onChange().create();
}

/* Ao editar a aba Vagas, atualiza os painéis automaticamente. */
function aoEditarVagas(e) {
  var nome = '';
  try { nome = e && e.range ? e.range.getSheet().getName() : ''; } catch (_) { nome = ''; }
  if (nome !== 'Vagas') return;
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('PAINEL_EM_ATUALIZACAO') === 'SIM') return;
  props.setProperty('PAINEL_EM_ATUALIZACAO', 'SIM');
  try { atualizarPainelVagas(); } finally { props.deleteProperty('PAINEL_EM_ATUALIZACAO'); }
}

/* Atualiza os painéis de vagas e monitoramento. */
function atualizarPainelVagas() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { var c = config_(), r = registrations_(); painelVagas_(c, r); monitoramento_(c, r); } finally { lock.releaseLock(); }
}

/* Prepara as abas (preserva dados existentes). */
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
    if (name === 'Funcoes' && typeof CATALOGO_FUNCOES !== 'undefined' && CATALOGO_FUNCOES.length) {
      var roles = [];
      ['ept','eja'].forEach(function (id) { CATALOGO_FUNCOES.forEach(function (f) {
        var limite = f.limites ? f.limites[id] : f.limite;
        roles.push([id,f.id,f.nome,f.tipo,f.nte || '',limite || 0,f.grupo || f.id,'SIM',f.setor || '']);
      }); });
      sheet.getRange(2,1,roles.length,9).setValues(roles);
    }
    if (name === 'MunicipiosNTE' && typeof CATALOGO_MUNICIPIOS !== 'undefined' && CATALOGO_MUNICIPIOS.length) {
      sheet.getRange(2,1,CATALOGO_MUNICIPIOS.length,2).setValues(CATALOGO_MUNICIPIOS.map(function (m) { return [m.nome,m.nte]; }));
    }
    if (name === 'Funcoes' && typeof CATALOGO_FUNCOES === 'undefined') semDados.push('Funcoes (falta Catalogo.gs)');
    if (name === 'MunicipiosNTE' && typeof CATALOGO_MUNICIPIOS === 'undefined') semDados.push('MunicipiosNTE (falta Municipios.gs)');
  });
  Logger.log(criadas.length ? 'Abas criadas: ' + criadas.join(', ') : 'Nada a criar: as abas ja existiam.');
  if (semDados.length) Logger.log('Criadas so com o cabecalho: ' + semDados.join('; '));
}

/* Gera o segredo da integração se não existir. */
function mostrarSegredo() {
  var props = PropertiesService.getScriptProperties();
  var segredo = props.getProperty('API_SECRET');
  var novo = !segredo || segredo.length < 32;
  if (novo) {
    segredo = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('API_SECRET', segredo);
  }
  Logger.log((novo ? 'Segredo criado e salvo em API_SECRET.' : 'API_SECRET ja existia; reaproveitando.'));
  return segredo;
}
