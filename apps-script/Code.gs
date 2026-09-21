/* Adicione Core.js e Catalogo.gs ao MESMO projeto Apps Script. */
var HEADERS = {
  Eventos: ['EventoID','Nome','Data','Local','Horario','Status','Abertura','Encerramento','LimiteTotal','LimitePorMunicipio'],
  Funcoes: ['EventoID','FuncaoID','Nome','Tipo','NTE','Limite','GrupoVagas','Ativa','Setor'],
  MunicipiosNTE: ['Municipio','NTE'],
  /* Colunas da planilha base, com Evento acrescentado e as tecnicas no fim. O envio localiza cada
     coluna pelo nome do cabecalho: reordenar nao quebra, colunas a mais sao ignoradas e recriar uma
     coluna conhecida (NTE, Municipio, Setor, Tipo) volta a preenche-la sem mudar codigo. */
  /* A aba Vagas nao entra aqui: ela e montada a mao e o script so preenche Inscritos e Disponiveis. */
  Inscricoes: ['Data/Hora','Evento','Nome','CPF','Telefone','E-mail','Funcao','NTE','Observacoes','InscricaoID','Status','EventoID','FuncaoID','GrupoVagas','ChaveRequisicao','DadosRequisicao'],
};
/* Prazo acordado: os dois eventos encerram em 05/10 as 23:59 (America/Bahia).
   O segundo 59 mantem o minuto 23:59 inteiro dentro do prazo.
   Abertura fica em branco de proposito: preencha-a e mude Status para ABERTO ao liberar. */
/* LimiteTotal 250, o TOTAL de cada tabela da aba Vagas e a soma exata das cotas do evento. */
var EVENTOS_PADRAO = [
  ['ept','EPT','2026-10-07','','','RASCUNHO','','2026-10-05T23:59:59-03:00',250,1],
  ['eja','EJA','2026-10-08','','','RASCUNHO','','2026-10-05T23:59:59-03:00',250,1]
];
/* Colunas acrescentadas depois da primeira versao: ausentes em planilhas antigas, lidas como vazias. */
var COLUNAS_OPCIONAIS = { Funcoes: ['Setor'], Inscricoes: ['Observacoes'] };
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
  var funcoes = table_('Funcoes').map(function (r) { return { eventoId:r.EventoID, id:r.FuncaoID, nome:r.Nome, tipo:r.Tipo, nte:r.NTE, limite:number_(r.Limite), grupo:r.GrupoVagas, ativa:r.Ativa === 'SIM', setor:r.Setor || '' }; });
  // Os 417 municipios so sao lidos quando alguma funcao municipal existe: sem isso, seriam
  // 417 linhas percorridas em toda requisicao para nada.
  var precisaMunicipios = funcoes.some(function (f) { return f.tipo === 'MUNICIPAL' && f.ativa; });
  var config = {
    eventos: table_('Eventos').map(function (r) { return { id:r.EventoID, nome:r.Nome, data:r.Data, local:r.Local, horario:r.Horario, status:r.Status, abertura:r.Abertura, encerramento:r.Encerramento, limite:number_(r.LimiteTotal), limiteMunicipio:number_(r.LimitePorMunicipio) }; }),
    funcoes: funcoes,
    municipios: precisaMunicipios ? table_('MunicipiosNTE').map(function (r) { return { nome:r.Municipio, nte:r.NTE }; }) : []
  };
  var ids = {};
  config.eventos.forEach(function (e) { if (!e.id || ids[e.id]) throw new Error('EventoID duplicado ou ausente'); ids[e.id] = true; });
  return config;
}
function registrations_() {
  return table_('Inscricoes').map(function (r) { return { id:r.InscricaoID, eventoId:r.EventoID, eventoNome:r.Evento, cpf:r.CPF, funcaoId:r.FuncaoID, grupoVagas:r.GrupoVagas, municipio:r.Municipio, tipo:r.Tipo, status:r.Status, requestId:r.ChaveRequisicao, canonical:r.DadosRequisicao }; });
}
function jsonTexto_(texto) { return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON); }
function json_(data) { return jsonTexto_(JSON.stringify(data)); }
/* A leitura de configuracao e identica para todo visitante e cara: le Eventos, Funcoes e
   Inscricoes inteiras. Guardar por alguns segundos derruba o numero de execucoes, que e o
   que faz o Apps Script enfileirar requisicao ate estourar o tempo do site. */
var CACHE_CONFIG = 'config-publica', CACHE_SEGUNDOS = 15;
function doGet() { return json_({ success:false, code:'METHOD_NOT_ALLOWED', message:'Use a integração do site.' }); }
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 10000) return json_({ success:false, code:'INVALID_INPUT', message:'Envio inválido.' });
    var payload = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
    if (!secret || secret.length < 32 || payload.secret !== secret) return json_({ success:false, code:'UNAUTHORIZED', message:'Integração não autorizada.' });
    if (payload.action === 'config') {
      var cache = CacheService.getScriptCache(), pronto = cache.get(CACHE_CONFIG);
      if (pronto) return jsonTexto_(pronto);
      var config = config_(), rows = registrations_();
      var texto = JSON.stringify({ success:true, eventos:config.eventos.map(function (event) { return RegistrationCore.publicEvent(event, config.funcoes, rows, Date.now()); }), municipios:config.municipios.map(function (m) { return m.nome; }) });
      cache.put(CACHE_CONFIG, texto, CACHE_SEGUNDOS);
      return jsonTexto_(texto);
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
      // Chaves iguais aos cabecalhos; as que a aba nao tiver sao simplesmente ignoradas.
      var values = { InscricaoID:r.id, EventoID:r.eventoId, Evento:r.eventoNome,
        'Data/Hora':Utilities.formatDate(new Date(), 'America/Bahia', "yyyy-MM-dd'T'HH:mm:ssXXX"), Nome:r.nome,
        CPF:r.cpf, Telefone:r.telefone, 'E-mail':r.email, FuncaoID:r.funcaoId, Funcao:r.funcao,
        Setor:r.setor, Tipo:r.tipo, Municipio:r.municipio, NTE:r.nte, GrupoVagas:r.grupoVagas,
        Status:r.status, ChaveRequisicao:r.requestId, DadosRequisicao:r.canonical };
      var sheet = database_().getSheetByName('Inscricoes');
      var header = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      // Prefixo de texto impede fórmulas e preserva zeros iniciais.
      var row = header.map(function (h) { return values[h] === undefined ? '' : "'" + String(values[h]); });
      sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setNumberFormat('@').setValues([row]);
      SpreadsheetApp.flush();
      // A vaga mudou: a proxima leitura precisa ser real, nao a guardada.
      try { CacheService.getScriptCache().remove(CACHE_CONFIG); } catch (_) {}
      // Painel em tempo real. Falha aqui nunca invalida uma inscricao ja gravada.
      try { var atual = config_(), linhas = registrations_(); painelVagas_(atual, linhas); monitoramento_(atual, linhas); } catch (_) {}
      return json_({ success:true, protocolo:r.id, evento:r.eventoNome });
    } finally { lock.releaseLock(); }
  } catch (error) {
    // Não devolver exceções internas nem dados pessoais.
    return json_({ success:false, code:error.code || 'INTERNAL_ERROR', message:error.code ? error.message : 'Não foi possível processar a solicitação. Tente novamente.' });
  }
}
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
/* Comparacao tolerante a acento, caixa e espaco duplo, para casar rotulos escritos a mao. */
function normal_(valor) {
  return String(valor == null ? '' : valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
/* Traduz o rotulo do painel para as funcoes do catalogo que ele representa. As tres linhas de NTE
   sao agregados dos 27 NTE; a linha longa de Salvador corresponde a Gestao Escolar - Salvador. */
var PAPEIS_NTE = {
  'diretores dos nte': 'Diretor(a)',
  'pontos focais do sabe nos nte': 'Ponto Focal do SABE',
  'coordenadores pedagogicos dos nte': 'Coordenador(a) Pedagogico(a)'
};
function funcoesDoRotulo_(rotulo, funcoes) {
  var alvo = normal_(rotulo);
  if (!alvo) return null;
  if (PAPEIS_NTE[alvo]) {
    var papel = PAPEIS_NTE[alvo];
    return funcoes.filter(function (f) { return f.tipo === 'NTE' && normal_(f.nome) === papel.toLowerCase(); });
  }
  var diretas = funcoes.filter(function (f) {
    return normal_(f.nome) === alvo || (f.setor && normal_(f.setor + '/' + f.nome) === alvo);
  });
  if (diretas.length) return diretas;
  if (alvo.indexOf('unidades escolares de salvador') >= 0)
    return funcoes.filter(function (f) { return f.id === 'gestao-escolar-salvador'; });
  return [];
}
/* Preenche Inscritos e Disponiveis do painel montado a mao, sem tocar em rotulo, limite ou formato.
   Localiza cada bloco pelo cabecalho "Funcao / Instituicao" e o evento pelo titulo acima dele. */
function painelVagas_(config, rows) {
  var sheet = database_().getSheetByName('Vagas');
  if (!sheet) return;
  var valores = sheet.getDataRange().getDisplayValues();
  var linhaCabecalho = -1, colunas = [];
  for (var r = 0; r < valores.length && linhaCabecalho < 0; r++) {
    for (var c = 0; c < valores[r].length; c++) {
      if (normal_(valores[r][c]) === 'funcao / instituicao') { linhaCabecalho = r; colunas.push(c); }
    }
  }
  if (linhaCabecalho < 1 || !colunas.length) return; // Painel fora do formato esperado: nao mexer.
  colunas.forEach(function (coluna) {
    var evento = null;
    for (var acima = linhaCabecalho - 1; acima >= 0 && !evento; acima--) {
      var titulo = normal_(valores[acima][coluna]);
      evento = config.eventos.filter(function (e) { return normal_(e.nome) === titulo || normal_(e.id) === titulo; })[0];
    }
    if (!evento) return;
    var ativas = config.funcoes.filter(function (f) { return f.eventoId === evento.id && f.ativa; });
    var inscritas = rows.filter(function (r) { return r.eventoId === evento.id && r.status === 'CONFIRMADA'; });
    var saida = [];
    for (var linha = linhaCabecalho + 1; linha < valores.length; linha++) {
      var rotulo = valores[linha][coluna];
      if (normal_(rotulo) === 'total') {
        saida.push([inscritas.length, Math.max(0, evento.limite - inscritas.length)]);
        continue;
      }
      var funcoes = funcoesDoRotulo_(rotulo, ativas);
      if (!funcoes || !funcoes.length) { saida.push(['', '']); continue; }
      var grupos = {}, limite = 0;
      funcoes.forEach(function (f) { grupos[f.grupo || f.id] = true; limite += (f.limite || 0); });
      var usadas = inscritas.filter(function (r) { return grupos[r.grupoVagas]; }).length;
      saida.push([usadas, Math.max(0, limite - usadas)]);
    }
    if (saida.length) sheet.getRange(linhaCabecalho + 2, coluna + 3, saida.length, 2).setValues(saida);
  });
}
/* Cores dos eventos, iguais as do site: EJA em vermelho, EPT em azul. */
var CORES_EVENTO = { eja: '#c22626', ept: '#1a3a8a' };
/* Chaves ja normalizadas: o nome no catalogo tem acento e a comparacao precisa ignora-lo. */
var PLURAL_NTE = {
  'diretor(a)': 'Diretores dos NTE',
  'ponto focal do sabe': 'Pontos focais do SABE nos NTE',
  'coordenador(a) pedagogico(a)': 'Coordenadores pedagógicos dos NTE'
};
/* Uma linha por cota visivel: as funcoes de NTE entram agregadas por papel, como no painel
   impresso, e as demais entram uma a uma, na ordem do catalogo. */
function linhasMonitoramento_(funcoes) {
  var linhas = [], vistos = {};
  funcoes.forEach(function (f) {
    if (f.tipo === 'NTE') {
      var chave = normal_(f.nome);
      if (vistos[chave]) return;
      vistos[chave] = true;
      linhas.push({ rotulo: PLURAL_NTE[chave] || (f.nome + ' dos NTE'),
        funcoes: funcoes.filter(function (g) { return g.tipo === 'NTE' && normal_(g.nome) === chave; }) });
    } else {
      linhas.push({ rotulo: RegistrationCore.nomeCompleto(f), funcoes: [f] });
    }
  });
  return linhas;
}
/* Faixa de cor pela ocupacao: folgado, apertado, lotado. */
function corOcupacao_(usadas, limite) {
  if (!limite) return '#f1f3f5';
  var razao = usadas / limite;
  if (razao >= 1) return '#fdecec';
  if (razao >= 0.8) return '#fdf3e0';
  return '#e8f5ed';
}
function blocoMonitoramento_(evento, funcoes, inscritas) {
  var corpo = [], cores = [];
  linhasMonitoramento_(funcoes).forEach(function (linha) {
    var grupos = {}, limite = 0;
    linha.funcoes.forEach(function (f) { grupos[f.grupo || f.id] = true; limite += (f.limite || 0); });
    var usadas = inscritas.filter(function (r) { return grupos[r.grupoVagas]; }).length;
    corpo.push([linha.rotulo, limite, usadas, Math.max(0, limite - usadas), limite ? usadas / limite : 0]);
    cores.push([corOcupacao_(usadas, limite)]);
  });
  var total = evento.limite || 0;
  corpo.push(['TOTAL', total, inscritas.length, Math.max(0, total - inscritas.length),
    total ? inscritas.length / total : 0]);
  cores.push([corOcupacao_(inscritas.length, total)]);
  return { corpo: corpo, cores: cores };
}
/* Aba de monitoramento: um bloco por evento, lado a lado, com ocupacao em cor. */
function monitoramento_(config, rows) {
  var ss = database_();
  var sheet = ss.getSheetByName('Monitoramento') || ss.insertSheet('Monitoramento');
  var eventos = config.eventos.slice(0, 2);
  if (!eventos.length) return;
  var blocos = eventos.map(function (evento) {
    return blocoMonitoramento_(evento,
      config.funcoes.filter(function (f) { return f.eventoId === evento.id && f.ativa; }),
      rows.filter(function (r) { return r.eventoId === evento.id && r.status === 'CONFIRMADA'; }));
  });
  var altura = Math.max.apply(null, blocos.map(function (b) { return b.corpo.length; }));
  var largura = 6;
  // Cabecalho fixo, remontado a cada atualizacao para acompanhar mudanca de evento.
  sheet.getRange(1, 1, 1, 1).setValue('Monitoramento de vagas').setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1, 1, 1).setValue('Atualizado em ' +
    Utilities.formatDate(new Date(), 'America/Bahia', 'dd/MM/yyyy HH:mm:ss')).setFontColor('#637185');
  if (sheet.getMaxRows() > altura + 5) sheet.getRange(altura + 6, 1, sheet.getMaxRows() - altura - 5, 12).clearContent();
  eventos.forEach(function (evento, i) {
    var coluna = 1 + i * largura;
    var titulo = sheet.getRange(4, coluna, 1, 5);
    titulo.merge().setValue(evento.nome).setBackground(CORES_EVENTO[evento.id] || '#1e2a3a')
      .setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    sheet.getRange(5, coluna, 1, 5)
      .setValues([['Função / Instituição', 'Limite', 'Inscritos', 'Disponíveis', 'Ocupação']])
      .setFontWeight('bold').setBackground('#f1f3f5');
    var corpo = blocos[i].corpo;
    sheet.getRange(6, coluna, corpo.length, 5).setValues(corpo);
    sheet.getRange(6, coluna + 4, corpo.length, 1).setNumberFormat('0%')
      .setBackgrounds(blocos[i].cores).setHorizontalAlignment('center');
    sheet.getRange(6 + corpo.length - 1, coluna, 1, 5).setFontWeight('bold').setBackground('#e8ebf1');
    sheet.setColumnWidth(coluna, 300);
    for (var c = 1; c <= 4; c++) sheet.setColumnWidth(coluna + c, 92);
    if (i === 0) sheet.setColumnWidth(coluna + 5, 24);
  });
  sheet.setFrozenRows(5);
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
  SpreadsheetApp.getUi().createMenu('Inscrições EPT / EJA').addItem('Preparar estrutura (preserva dados)', 'prepararPlanilha').addItem('Atualizar painel de vagas', 'atualizarPainelVagas').addItem('Montar painel de monitoramento', 'montarMonitoramento').addItem('Ativar atualizacao automatica', 'criarGatilhos').addToUi();
}
