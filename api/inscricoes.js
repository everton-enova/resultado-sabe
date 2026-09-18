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
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) || !secret || secret.length < 32)
    return send(503, { success: false, code: 'NOT_CONFIGURED', message: 'As inscrições estão em preparação. Volte em breve.' });
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
  try {
    const response = await fetch(url, {
      method: 'POST', redirect: 'follow', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, action: req.method === 'GET' ? 'config' : 'inscrever', data: body })
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (typeof result.success !== 'boolean') throw new Error();
    if (['UNAUTHORIZED','INTERNAL_ERROR'].includes(result.code)) throw new Error();
    return send(result.success ? 200 : (result.code === 'BUSY' ? 503 : 422), result);
  } catch (_) {
    return send(503, { success: false, code: 'CONNECTION_ERROR', message: 'Não foi possível confirmar a resposta. Tente novamente sem alterar os dados para recuperar seu envio.' });
  }
};
