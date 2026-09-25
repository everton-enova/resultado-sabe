/* Projeto dividido em arquivos curtos de proposito: o editor do Apps Script trunca
   colagem longa. Todos compartilham o mesmo escopo global, a ordem nao importa. */
/* Endpoint do site: devolve a configuracao e grava a inscricao. */
function jsonTexto_(texto) { return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON); }
function json_(data) { return jsonTexto_(JSON.stringify(data)); }
/* A leitura de configuracao e identica para todo visitante e cara: le Eventos, Funcoes e
   Inscricoes inteiras. Guardar por alguns segundos derruba o numero de execucoes, que e o
   que faz o Apps Script enfileirar requisicao ate estourar o tempo do site. */
var CACHE_CONFIG = 'config-publica', CACHE_SEGUNDOS = 60;
function doGet() { return json_({ success:false, code:'METHOD_NOT_ALLOWED', message:'Use a integração do site.' }); }
/* Protocolo curto para a pessoa guardar e ditar: 4 letras e 3 digitos embaralhados, em
   posicoes que mudam a cada sorteio (K7R2-9DQ, nunca um bloco de letras seguido de numeros).
   Sem I, O e Q, que se confundem com 1 e 0 na leitura. Nao e segredo e nao da acesso a nada:
   so identifica a inscricao, entao Math.random basta. Sorteia ate achar um livre, com a lista
   de usados lida dentro do bloqueio, o que torna a unicidade exata e nao provavel. */
var PROTOCOLO_LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
function protocolo_(usados) {
  for (var tentativa = 0; tentativa < 50; tentativa++) {
    var chars = [], i;
    for (i = 0; i < 4; i++) chars.push(PROTOCOLO_LETRAS.charAt(Math.floor(Math.random() * PROTOCOLO_LETRAS.length)));
    for (i = 0; i < 3; i++) chars.push(String(Math.floor(Math.random() * 10)));
    for (i = chars.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), troca = chars[i];
      chars[i] = chars[j]; chars[j] = troca;
    }
    var codigo = chars.slice(0, 4).join('') + '-' + chars.slice(4).join('');
    if (!usados[codigo]) return codigo;
  }
  // 50 repeticoes seguidas em bilhoes de combinacoes nao acontece por acaso: se acontecer,
  // melhor um id feio e garantido do que dois inscritos com o mesmo protocolo.
  return Utilities.getUuid();
}
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
    // Anotação de uma inscrição já gravada no Supabase: só escreve a linha, sem reconferir cota.
    if (payload.action === 'anotar') {
      var escritos = anotarRegistros_([payload.data || {}]);
      return json_({ success:true, protocolo:(payload.data || {}).protocolo, anotado:escritos.length > 0 });
    }
    if (payload.action !== 'inscrever') return json_({ success:false, code:'INVALID_ACTION', message:'Ação inválida.' });
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return json_({ success:false, code:'BUSY', message:'Há outros envios em andamento. Tente novamente em instantes.' });
    try {
      // Releitura dentro do bloqueio é obrigatória para conferir a última vaga.
      var linhas = registrations_();
      var result = RegistrationCore.prepare(payload.data || {}, config_(), linhas, Date.now());
      if (result.existing) return json_({ success:true, protocolo:result.existing.id, evento:result.existing.eventoNome });
      var r = result.record;
      var usados = {};
      for (var n = 0; n < linhas.length; n++) usados[linhas[n].id] = true;
      r.id = protocolo_(usados);
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
