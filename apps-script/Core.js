/* Regras puras compartilhadas pelos testes e pelo Apps Script. */
var RegistrationCore = (function () {
  'use strict';
  function fail(code, message) { var error = new Error(message); error.code = code; throw error; }
  function digits(value) { return String(value || '').replace(/\D/g, ''); }
  function validCPF(value) {
    var cpf = digits(value);
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
    for (var size = 9; size <= 10; size++) {
      var sum = 0;
      for (var i = 0; i < size; i++) sum += Number(cpf[i]) * (size + 1 - i);
      var check = 11 - sum % 11;
      if (Number(cpf[size]) !== (check >= 10 ? 0 : check)) return false;
    }
    return true;
  }
  function text(value, max) {
    if (typeof value !== 'string' || value.trim().length > max) fail('INVALID_INPUT', 'Revise os dados informados.');
    return value.trim();
  }
  function normalize(input) {
    var data = {
      eventoId: text(input.eventoId, 30), nome: text(input.nome, 150),
      cpf: digits(text(input.cpf, 20)), telefone: digits(text(input.telefone, 25)),
      email: text(input.email, 150).toLowerCase(), funcaoId: text(input.funcaoId, 80),
      municipio: text(input.municipio || '', 100), requestId: text(input.requestId, 80)
    };
    if (!data.nome || !validCPF(data.cpf) || !/^\d{10,11}$/.test(data.telefone) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.funcaoId ||
        !/^[a-zA-Z0-9-]{16,80}$/.test(data.requestId)) fail('INVALID_INPUT', 'Confira nome, CPF, telefone, e-mail e função.');
    return data;
  }
  function count(value) { return Number.isInteger(value) && value >= 0; }
  function eventReady(event) {
    return !!event && count(event.limite) && event.limite > 0 && count(event.limiteMunicipio) && event.limiteMunicipio > 0 &&
      typeof event.abertura === 'string' && typeof event.encerramento === 'string' &&
      /(?:Z|[+-]\d\d:\d\d)$/.test(event.abertura) && /(?:Z|[+-]\d\d:\d\d)$/.test(event.encerramento) &&
      Number.isFinite(Date.parse(event.abertura)) && Date.parse(event.encerramento) > Date.parse(event.abertura);
  }
  function state(event, now) {
    if (!eventReady(event) || event.status !== 'ABERTO') return 'FECHADO';
    if (now < Date.parse(event.abertura)) return 'EM_BREVE';
    if (now >= Date.parse(event.encerramento)) return 'ENCERRADO';
    return 'ABERTO';
  }
  function functionsFor(event, functions) {
    var selected = functions.filter(function (f) { return f.eventoId === event.id && f.ativa; });
    var ids = {}, groups = {};
    selected.forEach(function (f) {
      if (!f.id || !f.nome || ids[f.id] || !count(f.limite) || ['INSTITUCIONAL', 'MUNICIPAL', 'NTE'].indexOf(f.tipo) < 0 ||
          (f.tipo === 'NTE' && !/^NTE (0[1-9]|1\d|2[0-7])$/.test(f.nte))) fail('CONFIG_ERROR', 'As vagas deste evento estão em configuração.');
      ids[f.id] = true;
      var key = f.grupo || f.id;
      if (groups[key] !== undefined && groups[key] !== f.limite) fail('CONFIG_ERROR', 'As vagas compartilhadas precisam ter o mesmo limite.');
      groups[key] = f.limite;
    });
    if (!selected.length) fail('CONFIG_ERROR', 'As funções deste evento estão em configuração.');
    return selected;
  }
  function activeRows(eventId, rows) { return rows.filter(function (r) { return r.eventoId === eventId && r.status === 'CONFIRMADA'; }); }
  function publicEvent(event, functions, rows, now) {
    var result = { id: event.id, nome: event.nome, data: event.data, local: event.local, horario: event.horario,
      abertura: event.abertura, encerramento: event.encerramento, limite: event.limite,
      estado: state(event, now), disponiveis: 0, funcoes: [], municipiosLotados: [] };
    var selected;
    try { selected = functionsFor(event, functions); } catch (_) { result.estado = 'FECHADO'; return result; }
    var active = activeRows(event.id, rows);
    result.disponiveis = Math.max(0, event.limite - active.length);
    result.funcoes = selected.map(function (f) {
      var used = active.filter(function (r) { return r.grupoVagas === (f.grupo || f.id); }).length;
      return { id: f.id, nome: f.nome, tipo: f.tipo, nte: f.nte, setor: f.setor || '', disponiveis: Math.max(0, Math.min(f.limite - used, result.disponiveis)) };
    });
    var municipalities = {};
    active.filter(function (r) { return r.tipo === 'MUNICIPAL'; }).forEach(function (r) { municipalities[r.municipio] = (municipalities[r.municipio] || 0) + 1; });
    result.municipiosLotados = Object.keys(municipalities).filter(function (m) { return municipalities[m] >= event.limiteMunicipio; });
    if (result.estado === 'ABERTO' && (!result.disponiveis || !result.funcoes.some(function (f) { return f.disponiveis > 0; }))) result.estado = 'ESGOTADO';
    return result;
  }
  function prepare(input, config, rows, now) {
    var data = normalize(input);
    var event = config.eventos.find(function (e) { return e.id === data.eventoId; });
    if (!event) fail('INVALID_EVENT', 'Selecione um evento válido.');
    var canonical = JSON.stringify([data.eventoId, data.nome, data.cpf, data.telefone, data.email, data.funcaoId, data.municipio]);
    var existing = rows.find(function (r) { return r.requestId === data.requestId; });
    if (existing) {
      if (existing.canonical !== canonical) fail('REQUEST_CONFLICT', 'Este envio foi alterado. Atualize a página e tente novamente.');
      return { existing: existing };
    }
    if (state(event, now) !== 'ABERTO') fail('EVENT_CLOSED', 'As inscrições deste evento não estão abertas.');
    if (rows.some(function (r) { return r.eventoId === event.id && digits(r.cpf) === data.cpf; })) fail('DUPLICATE_CPF', 'Este CPF já possui uma inscrição neste evento.');
    var functions = functionsFor(event, config.funcoes);
    var role = functions.find(function (f) { return f.id === data.funcaoId; });
    if (!role) fail('INVALID_ROLE', 'Selecione uma função válida para este evento.');
    var territory = config.municipios.find(function (m) { return m.nome === data.municipio; });
    if (role.tipo === 'MUNICIPAL' && !territory) fail('INVALID_MUNICIPALITY', 'Selecione um município válido.');
    if (role.tipo !== 'MUNICIPAL' && data.municipio) fail('INVALID_INPUT', 'Revise o município para a função selecionada.');
    var active = activeRows(event.id, rows);
    if (active.length >= event.limite) fail('SOLD_OUT', 'As vagas deste evento foram preenchidas.');
    var group = role.grupo || role.id;
    if (active.filter(function (r) { return r.grupoVagas === group; }).length >= role.limite) fail('ROLE_SOLD_OUT', 'As vagas desta função foram preenchidas.');
    if (role.tipo === 'MUNICIPAL' && active.filter(function (r) { return r.tipo === 'MUNICIPAL' && r.municipio === data.municipio; }).length >= event.limiteMunicipio) fail('MUNICIPALITY_SOLD_OUT', 'Este município já atingiu seu limite de representantes.');
    return { record: Object.assign({}, data, { eventoNome: event.nome, funcao: role.nome, tipo: role.tipo, setor: role.setor || '',
      nte: role.tipo === 'NTE' ? role.nte : (territory ? territory.nte : ''),
      grupoVagas: group, canonical: canonical, status: 'CONFIRMADA' }) };
  }
  return { validCPF: validCPF, normalize: normalize, eventReady: eventReady, state: state, publicEvent: publicEvent, prepare: prepare };
}());
if (typeof module !== 'undefined') module.exports = RegistrationCore;
