'use strict';
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, data) => res.status(status).json(data);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(405, { success: false, message: 'Método não permitido.' });
  }
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  /* "variavel" diz qual das duas reprovou, sem devolver o valor de nenhuma: com os dois sites
     lendo a mesma planilha, so a mensagem generica nao distinguia variavel ausente de URL
     fora do formato, e cada tentativa custava um redeploy as cegas. */
  // Chave criada sem valor e um caso a parte de chave inexistente, e o conserto e outro.
  const faltando = nome => process.env[nome] === undefined ? nome + ' ausente' : nome + ' existe, mas está vazia';
  const configuracao = !url ? faltando('APPS_SCRIPT_URL')
    : !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) ? 'APPS_SCRIPT_URL fora do formato .../exec'
    : !secret ? faltando('APPS_SCRIPT_SECRET')
    : secret.length < 32 ? 'APPS_SCRIPT_SECRET com menos de 32 caracteres'
    : null;
  if (configuracao) {
    /* "ausente" ainda comporta tres causas: nome da chave digitado errado, variavel salva em
       Preview em vez de Production, ou dominio apontando para outro projeto. Devolvemos os
       NOMES das chaves parecidas (nunca os valores) e o EVENTO da build, que identifica o
       projeto que atendeu. Nada aqui e segredo: os dois ja aparecem no HTML e na documentacao. */
    const chaves = Object.keys(process.env).filter(k => /script/i.test(k)).sort();
    return send(503, { success: false, code: 'NOT_CONFIGURED', variavel: configuracao,
      evento: process.env.EVENTO || '(ausente)', chavesEncontradas: chaves,
      message: 'As inscrições estão em preparação. Volte em breve.' });
  }
  let body = {};
  if (req.method === 'POST') {
    try {
      if (!String(req.headers['content-type'] || '').includes('application/json')) throw new Error();
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 6000) throw new Error();
      // Somente campos conhecidos são encaminhados; segredo/ação nunca vêm do cliente.
      body = Object.fromEntries(['eventoId','nome','cpf','telefone','email','funcaoId','municipio','requestId'].map(k => [k, body[k]]));
    } catch (_) { return send(400, { success: false, message: 'Envio inválido. Revise os campos.' }); }
  }
  const payload = JSON.stringify({ secret, action: req.method === 'GET' ? 'config' : 'inscrever', data: body });
  // O Apps Script responde em poucos segundos quando responde; quando trava, nao volta.
  // Prazo curto por tentativa faz a chamada travada falhar cedo e sobrar tempo para repetir.
  const inicio = Date.now(), PRAZO = 24000, POR_TENTATIVA = 9000;
  const tentar = async prazo => {
    const response = await fetch(url, {
      method: 'POST', redirect: 'follow', signal: AbortSignal.timeout(prazo),
      headers: { 'Content-Type': 'application/json' }, body: payload
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (typeof result.success !== 'boolean') throw new Error();
    return result;
  };
  try {
    let result = null;
    // O Apps Script as vezes responde ao POST com um redirecionamento que vira GET, e cai no doGet.
    // Repetir e seguro: o requestId torna a inscricao idempotente e a leitura de config nao tem efeito.
    for (let tentativa = 0; tentativa < 3 && !result; tentativa++) {
      const restante = PRAZO - (Date.now() - inicio);
      if (restante < 2000) break;
      let atual;
      try { atual = await tentar(Math.min(POR_TENTATIVA, restante)); } catch (_) { continue; }
      if (atual.code !== 'METHOD_NOT_ALLOWED') result = atual;
    }
    if (!result) throw new Error();
    if (['UNAUTHORIZED','INTERNAL_ERROR'].includes(result.code)) throw new Error();
    // A configuração é igual para todo visitante e muda devagar: o CDN pode servir por alguns
    // segundos, tirando o Apps Script do caminho crítico. "stale-while-revalidate" devolve a
    // última cópia boa mesmo que a revalidação no fundo demore ou falhe, o que evita o aviso
    // de "em preparação" enquanto o Google oscila. O POST continua sem cache.
    if (result.success && req.method === 'GET') res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return send(result.success ? 200 : (result.code === 'BUSY' ? 503 : 422), result);
  } catch (_) {
    return send(503, { success: false, code: 'CONNECTION_ERROR', message: 'Não foi possível confirmar a resposta. Tente novamente sem alterar os dados para recuperar seu envio.' });
  }
};
