/* Projeto dividido em arquivos curtos de proposito: o editor do Apps Script trunca
   colagem longa. Todos compartilham o mesmo escopo global, a ordem nao importa. */
/* Leitura da planilha: cabecalhos, abertura e conversao das abas em objetos. */
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
var _planilha = null;
function database_() {
  // openById e caro e era repetido a cada aba lida. Numa execucao, basta abrir uma vez.
  if (_planilha) return _planilha;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID ausente');
  _planilha = SpreadsheetApp.openById(id);
  return _planilha;
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
/* Abertura e Encerramento sao texto ISO, mas basta o Sheets converter a celula em data para
   getDisplayValues devolver "05/10/2026 23:59:59". Sem fuso, o evento reprovaria em silencio e
   ficaria FECHADO sem explicacao, entao aceitamos tambem o formato exibido. -03:00 e fixo:
   o manifesto prende o projeto a America/Bahia, que nao tem horario de verao. */
function instante_(v) {
  var t = String(v == null ? '' : v).trim();
  var br = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (!br) return t;
  function dois(n) { return ('0' + (n || '0')).slice(-2); }
  return br[3] + '-' + br[2] + '-' + br[1] + 'T' + dois(br[4]) + ':' + dois(br[5]) + ':' + dois(br[6]) + '-03:00';
}
function config_() {
  var funcoes = table_('Funcoes').map(function (r) { return { eventoId:r.EventoID, id:r.FuncaoID, nome:r.Nome, tipo:r.Tipo, nte:r.NTE, limite:number_(r.Limite), grupo:r.GrupoVagas, ativa:r.Ativa === 'SIM', setor:r.Setor || '' }; });
  // Os 417 municipios so sao lidos quando alguma funcao municipal existe: sem isso, seriam
  // 417 linhas percorridas em toda requisicao para nada.
  var precisaMunicipios = funcoes.some(function (f) { return f.tipo === 'MUNICIPAL' && f.ativa; });
  var config = {
    eventos: table_('Eventos').map(function (r) { return { id:r.EventoID, nome:r.Nome, data:r.Data, local:r.Local, horario:r.Horario, status:r.Status, abertura:instante_(r.Abertura), encerramento:instante_(r.Encerramento), limite:number_(r.LimiteTotal), limiteMunicipio:number_(r.LimitePorMunicipio) }; }),
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
