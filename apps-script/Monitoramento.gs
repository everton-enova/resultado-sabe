/* Projeto dividido em arquivos curtos de proposito: o editor do Apps Script trunca
   colagem longa. Todos compartilham o mesmo escopo global, a ordem nao importa. */
/* Monta a aba Monitoramento, um bloco por evento, com ocupacao em cor. */
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
