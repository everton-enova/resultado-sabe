/* Projeto dividido em arquivos curtos de proposito: o editor do Apps Script trunca
   colagem longa. Todos compartilham o mesmo escopo global, a ordem nao importa. */
/* Preenche Inscritos e Disponiveis do painel montado a mao na aba Vagas. */
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
