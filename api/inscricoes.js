'use strict';
/* Endpoint do site. O Supabase e a fonte da verdade (leitura rápida e escrita atômica);
   a planilha recebe as inscrições pelo Apps Script logo depois, sem bloquear a resposta. */
const core = require('../apps-script/Core.js');

/* Monta o payload público a partir das tabelas e das contagens agregadas. */
function publico(eventos, funcoes, municipios, contagens) {
  const now = Date.now(), total = {}, grupo = {}, muni = {}, chave = (a, b) => a + '\u0000' + b;
  for (const c of contagens || []) {
    const n = Number(c.total) || 0;
    total[c.evento_id] = (total[c.evento_id] || 0) + n;
    grupo[chave(c.evento_id, c.grupo_vagas)] = (grupo[chave(c.evento_id, c.grupo_vagas)] || 0) + n;
    if (c.municipio) muni[chave(c.evento_id, c.municipio)] = (muni[chave(c.evento_id, c.municipio)] || 0) + n;
  }
  const funcs = (funcoes || []).map(f => ({ eventoId: f.evento_id, id: f.id, nome: f.nome, tipo: f.tipo,
    nte: f.nte, setor: f.setor || '', grupo: f.grupo_vagas || '', limite: f.limite, ativa: f.ativa }));
  return { success: true, eventos: (eventos || []).map(e => {
    const ev = { id: e.id, nome: e.nome, status: e.status, abertura: e.abertura, encerramento: e.encerramento,
      limite: e.limite_total, limiteMunicipio: e.limite_municipio };
    const out = { id: e.id, nome: e.nome, data: e.data, local: e.local, horario: e.horario,
      abertura: e.abertura, encerramento: e.encerramento, limite: e.limite_total,
      estado: core.state(ev, now), disponiveis: 0, funcoes: [], municipiosLotados: [] };
    let selecionadas;
    try { selecionadas = core.functionsFor(ev, funcs); } catch (_) { out.estado = 'FECHADO'; return out; }
    const disponiveis = Math.max(0, (e.limite_total || 0) - (total[e.id] || 0));
    out.disponiveis = disponiveis;
    out.funcoes = selecionadas.map(f => {
      const usado = grupo[chave(e.id, f.grupo || f.id)] || 0;
      return { id: f.id, nome: f.nome, tipo: f.tipo, nte: f.nte, setor: f.setor || '',
        disponiveis: Math.max(0, Math.min((f.limite || 0) - usado, disponiveis)) };
    });
    out.municipiosLotados = (municipios || [])
      .filter(m => (muni[chave(e.id, m.nome)] || 0) >= (e.limite_municipio || 0))
      .map(m => m.nome);
    if (out.estado === 'ABERTO' && (!out.disponiveis || !out.funcoes.some(f => f.disponiveis > 0))) out.estado = 'ESGOTADO';
    return out;
  }), municipios: (municipios || []).map(m => m.nome) };
}

const handler = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, data) => res.status(status).json(data);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(405, { success: false, message: 'Método não permitido.' });
  }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  const faltando = nome => process.env[nome] === undefined ? nome + ' ausente' : nome + ' existe, mas está vazia';
  const configuracao = !url ? faltando('SUPABASE_URL')
    : !/^https:\/\/[\w-]+\.supabase\.co$/.test(url) ? 'SUPABASE_URL fora do formato https://xxxx.supabase.co'
    : !key ? faltando('SUPABASE_ANON_KEY') : null;
  if (configuracao) {
    const chaves = Object.keys(process.env).filter(k => /supabase/i.test(k)).sort();
    return send(503, { success: false, code: 'NOT_CONFIGURED', variavel: configuracao,
      evento: process.env.EVENTO || '(ausente)', chavesEncontradas: chaves,
      message: 'As inscrições estão em preparação. Volte em breve.' });
  }

  const rest = async (caminho, options = {}) => {
    const response = await fetch(url + '/rest/v1' + caminho, {
      ...options,
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) { const texto = await response.text().catch(() => ''); const erro = new Error('supabase ' + response.status + ' ' + texto); erro.status = response.status; throw erro; }
    return response.json();
  };

  if (req.method === 'GET') {
    try {
      const [eventos, funcoes, municipios, contagens] = await Promise.all([
        rest('/eventos?select=*'), rest('/funcoes?select=*'), rest('/municipios?select=*'),
        rest('/rpc/contagens_vagas', { method: 'POST', body: '{}' })
      ]);
      // A configuração é igual para todo visitante e muda devagar: o CDN serve por alguns
      // segundos e, no "stale-while-revalidate", devolve a última cópia boa mesmo se o fundo demorar.
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
      return send(200, publico(eventos, funcoes, municipios, contagens));
    } catch (_) {
      return send(503, { success: false, code: 'CONNECTION_ERROR', message: 'Não foi possível carregar as vagas agora.' });
    }
  }

  let body = {};
  try {
    if (!String(req.headers['content-type'] || '').includes('application/json')) throw new Error();
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 6000) throw new Error();
    // Somente campos conhecidos são encaminhados; segredo/ação nunca vêm do cliente.
    body = Object.fromEntries(['eventoId','nome','cpf','telefone','email','funcaoId','municipio','requestId'].map(k => [k, body[k]]));
  } catch (_) { return send(400, { success: false, message: 'Envio inválido. Revise os campos.' }); }

  let data;
  try { data = core.normalize(body); }
  catch (erro) { return send(422, { success: false, code: erro.code || 'INVALID_INPUT', message: erro.message || 'Revise os dados informados.' }); }

  const canonical = JSON.stringify([data.eventoId, data.nome, data.cpf, data.telefone, data.email, data.funcaoId, data.municipio]);
  let result;
  try {
    result = await rest('/rpc/inscrever', { method: 'POST', body: JSON.stringify({
      p_evento_id: data.eventoId, p_nome: data.nome, p_cpf: data.cpf, p_telefone: data.telefone,
      p_email: data.email, p_funcao_id: data.funcaoId, p_municipio: data.municipio,
      p_chave: data.requestId, p_canonical: canonical
    }) });
  } catch (_) {
    return send(503, { success: false, code: 'CONNECTION_ERROR', message: 'Não foi possível confirmar a resposta. Tente novamente sem alterar os dados para recuperar seu envio.' });
  }
  if (!result || typeof result.success !== 'boolean') {
    return send(503, { success: false, code: 'CONNECTION_ERROR', message: 'Não foi possível confirmar a resposta. Tente novamente sem alterar os dados para recuperar seu envio.' });
  }
  if (result.success) {
    // A inscrição já está confirmada no banco. Anotar na planilha é melhor esforço: se falhar,
    // o gatilho do Apps Script busca as pendentes em instantes.
    await anotar(result.registro);
    return send(200, { success: true, protocolo: result.protocolo, evento: result.evento });
  }
  return send(result.code === 'BUSY' ? 503 : 422, result);
};

module.exports = handler;
module.exports.publico = publico;

/* Empurra a linha para a planilha pelo Apps Script, sem deixar o visitante esperando demais. */
async function anotar(registro) {
  const url = process.env.APPS_SCRIPT_URL, secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret || !registro) return;
  try {
    await fetch(url, { method: 'POST', redirect: 'follow', signal: AbortSignal.timeout(6000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, action: 'anotar', data: registro }) });
  } catch (_) { /* a rede de segurança do Apps Script cobre */ }
}
