/* Projeto dividido em arquivos curtos de proposito: o editor do Apps Script trunca
   colagem longa. Todos compartilham o mesmo escopo global, a ordem nao importa. */
/* Endpoint do site: devolve a configuracao e grava a inscricao. */
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
