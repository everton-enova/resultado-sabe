const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../apps-script/Core.js');
const ARQUIVOS_SCRIPT=['Planilha.gs','Api.gs','Painel.gs','Monitoramento.gs','Menu.gs'];
function carregaScript(alvo){for(const f of ARQUIVOS_SCRIPT)vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/'+f),'utf8'),alvo,{filename:f});}
function harness() {
  let locked=false, writes=0, releases=0;
  const rows=[];
  const event={id:'ept',nome:'EPT',status:'ABERTO',abertura:'2020-01-01T00:00:00-03:00',encerramento:'2099-01-01T00:00:00-03:00',limite:1,limiteMunicipio:1};
  const config={eventos:[event],funcoes:[{eventoId:'ept',id:'inst',nome:'Instituição',tipo:'INSTITUCIONAL',limite:10,ativa:true}],municipios:[]};
  const context={RegistrationCore:core, PropertiesService:{getScriptProperties:()=>({getProperty:()=> 's'.repeat(40)})},
    LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;releases++;}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
    Utilities:{getUuid:()=> 'generated-protocol-'+(writes+1),formatDate:()=> '2026-09-18T12:00:00-03:00'},SpreadsheetApp:{flush:()=>{assert.equal(locked,true);}},
    CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{},remove:()=>{}})}};
  vm.createContext(context);carregaScript(context);
  context.config_=()=>{assert.equal(locked,true);return config;};
  context.registrations_=()=>{assert.equal(locked,true);return rows;};
  context.database_=()=>({getSheetByName:()=>({getLastColumn:()=>context.HEADERS.Inscricoes.length,getLastRow:()=>rows.length+1,getRange:(r)=>({getDisplayValues:()=>[context.HEADERS.Inscricoes],setNumberFormat:()=>({setValues:values=>{assert.equal(locked,true);assert.ok(values[0].every(v=>v===''||v.startsWith("'")));const v=Object.fromEntries(context.HEADERS.Inscricoes.map((h,i)=>[h,values[0][i].slice(1)]));rows.push({raw:v,id:v.InscricaoID,eventoId:v.EventoID,eventoNome:v.Evento,cpf:v.CPF,grupoVagas:v.GrupoVagas,status:v.Status,requestId:v.ChaveRequisicao,canonical:v.DadosRequisicao});writes++;}})})})});
  const payload=overrides=>({secret:'s'.repeat(40),action:'inscrever',data:{eventoId:'ept',nome:'=Teste literal',cpf:'52998224725',telefone:'71999999999',email:'teste@example.invalid',funcaoId:'inst',municipio:'',requestId:'request-00000000001',...overrides}});
  const post=p=>context.doPost({postData:{contents:JSON.stringify(p)}});
  return {context,rows,post,payload,get writes(){return writes;},get releases(){return releases;},hold(){locked=true;},unlock(){locked=false;}};
}
test('Apps Script relê e grava sob bloqueio; disputa da última vaga só grava uma linha',()=>{const h=harness();assert.equal(h.post(h.payload()).success,true);const other=h.post(h.payload({cpf:'11144477735',requestId:'request-00000000002'}));assert.equal(other.code,'SOLD_OUT');assert.equal(h.writes,1);assert.equal(h.releases,2);});
test('Apps Script recupera protocolo após reenvio sem duplicar linha',()=>{const h=harness();const first=h.post(h.payload());const next=h.post(h.payload());assert.equal(next.protocolo,first.protocolo);assert.equal(h.writes,1);});
test('protocolo mistura letra e numero em posicoes que variam, sem repetir',()=>{const h=harness();
  const FORMA=/^[A-Z0-9]{4}-[A-Z0-9]{3}$/;
  const vistos=new Set(), posicoesComLetra=new Set(), posicoesComDigito=new Set();
  for(let i=0;i<500;i++){const c=h.context.protocolo_({});
    assert.match(c,FORMA,'formato: '+c);
    const chars=c.replace('-','').split('');
    assert.equal(chars.filter(x=>/[A-Z]/.test(x)).length,4,'letras: '+c);
    assert.equal(chars.filter(x=>/[0-9]/.test(x)).length,3,'digitos: '+c);
    assert.ok(!/[IOQ]/.test(c),'letra ambigua: '+c);
    chars.forEach((x,n)=>(/[A-Z]/.test(x)?posicoesComLetra:posicoesComDigito).add(n));
    vistos.add(c);}
  assert.equal(vistos.size,500,'protocolo repetido em 500 sorteios');
  // Sem ordem fixa: toda posicao ja saiu letra e ja saiu numero.
  assert.equal(posicoesComLetra.size,7,'posicoes que receberam letra: '+[...posicoesComLetra]);
  assert.equal(posicoesComDigito.size,7,'posicoes que receberam digito: '+[...posicoesComDigito]);
  // Codigo ja usado nunca e devolvido: com o sorteio preso num valor so, cai no reserva.
  vm.runInContext('var sorteioOriginal = Math.random; Math.random = function(){return 0;};',h.context);
  const fixo=h.context.protocolo_({});
  assert.equal(h.context.protocolo_({}),fixo,'sorteio preso deveria repetir');
  const usados={};usados[fixo]=true;
  assert.notEqual(h.context.protocolo_(usados),fixo);
  vm.runInContext('Math.random = sorteioOriginal;',h.context);
  // E o que vai para a planilha e o mesmo que volta para a pessoa.
  const res=h.post(h.payload());
  assert.equal(res.success,true);
  assert.match(res.protocolo,FORMA);
  assert.equal(h.rows[0].raw.InscricaoID,res.protocolo);});
test('requisição concorrente sem bloqueio disponível recebe resposta temporária',()=>{const h=harness();h.hold();assert.equal(h.post(h.payload()).code,'BUSY');assert.equal(h.writes,0);h.unlock();assert.equal(h.post(h.payload()).success,true);});
test('erro libera bloqueio e não expõe exceção; segredo errado não grava',()=>{const h=harness();const original=h.context.config_;h.context.config_=()=>{throw new Error('internal secret');};const result=h.post(h.payload());assert.equal(result.code,'INTERNAL_ERROR');assert.ok(!JSON.stringify(result).includes('internal secret'));assert.equal(h.releases,1);h.context.config_=original;assert.equal(h.post({...h.payload(),secret:'wrong'}).code,'UNAUTHORIZED');assert.equal(h.post(h.payload()).success,true);});
test('prazo semeado encerra os dois eventos em 05/10, mantendo o minuto 23:59 valido',()=>{const {context}=harness();const esperado={ept:'2026-10-05T23:59:59-03:00',eja:'2026-10-05T23:59:59-03:00'};assert.equal(context.EVENTOS_PADRAO.length,2);context.EVENTOS_PADRAO.forEach(row=>{const linha=Object.fromEntries(context.HEADERS.Eventos.map((h,i)=>[h,row[i]]));assert.equal(linha.Encerramento,esperado[linha.EventoID]);const evento={id:linha.EventoID,status:'ABERTO',abertura:'2026-09-01T00:00:00-03:00',encerramento:linha.Encerramento,limite:Number(linha.LimiteTotal),limiteMunicipio:Number(linha.LimitePorMunicipio)};const prazo=Date.parse(linha.Encerramento);assert.equal(core.state(evento,Date.parse(linha.Encerramento.replace('23:59:59','23:59:00'))),'ABERTO');assert.equal(core.state(evento,prazo-1),'ABERTO');assert.equal(core.state(evento,prazo),'ENCERRADO');});});
test('Abertura convertida em data pelo Sheets continua abrindo o evento',()=>{const {context}=harness();const iso='2026-09-21T00:00:00-03:00';assert.equal(context.instante_(iso),iso);assert.equal(context.instante_('21/09/2026 00:00:00'),iso);assert.equal(context.instante_('21/09/2026 9:05'),'2026-09-21T09:05:00-03:00');assert.equal(context.instante_('21/09/2026'),'2026-09-21T00:00:00-03:00');assert.equal(context.instante_(''),'');assert.equal(context.instante_(null),'');const evento={id:'ept',status:'ABERTO',abertura:context.instante_('21/09/2026 00:00:00'),encerramento:context.instante_('05/10/2026 23:59:59'),limite:250,limiteMunicipio:1};assert.equal(core.eventReady(evento),true);assert.equal(core.state(evento,Date.parse('2026-09-25T10:00:00-03:00')),'ABERTO');const fechado={...evento,abertura:''};assert.equal(core.state(fechado,Date.parse('2026-09-25T10:00:00-03:00')),'FECHADO');});
function catalogo(){const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Catalogo.gs'),'utf8'),ctx);return ctx.CATALOGO_FUNCOES;}
test('catalogo semeado reproduz a aba Vagas: 250 em cada evento, com as cotas que diferem',()=>{const {context}=harness();const funcoes=catalogo();const cota=(nome,id)=>{const f=funcoes.find(x=>x.nome===nome);return f.limites?f.limites[id]:f.limite;};const soma=id=>funcoes.reduce((t,f)=>t+(f.limites?f.limites[id]:f.limite),0);assert.equal(funcoes.length,98);assert.equal(funcoes.filter(f=>f.tipo==='NTE').length,81);['Diretor(a)','Ponto Focal do SABE','Coordenador(a) Pedagógico(a)'].forEach(nome=>{const linhas=funcoes.filter(f=>f.tipo==='NTE'&&f.nome===nome);assert.equal(linhas.length,27,nome);assert.equal(linhas.reduce((t,f)=>t+f.limite,0),27,nome);});assert.equal(soma('eja'),250);assert.equal(soma('ept'),250);assert.equal(cota('SUPROT','eja'),5);assert.equal(cota('SUPROT','ept'),10);assert.equal(cota('SUPED','eja'),10);assert.equal(cota('SUPED','ept'),5);[['IAT',8],['SUPEC',5],['SUDEPE',2],['DIE',13],['DAI',4],['DIROE',4],['CEEPE',2],['EGEPI',2],['FGV/DGPE',5],['IRDEB',2],['TCE',2],['APG',4],['GAB/SEC',5],['Gestão Escolar - Salvador',90],['EQUIPE SEC',6]].forEach(([nome,limite])=>{assert.equal(cota(nome,'eja'),limite,nome);assert.equal(cota(nome,'ept'),limite,nome);});assert.equal(funcoes.filter(f=>f.setor==='SGINF').length,3);assert.equal(funcoes.filter(f=>f.tipo==='MUNICIPAL').length,0);context.EVENTOS_PADRAO.forEach(row=>{const linha=Object.fromEntries(context.HEADERS.Eventos.map((h,i)=>[h,row[i]]));assert.equal(Number(linha.LimiteTotal),soma(linha.EventoID));});});
test('linha gravada segue as colunas da planilha base, com Evento e NTE, sem Municipio',()=>{const h=harness();const cabecalho=h.context.HEADERS.Inscricoes;assert.equal(cabecalho.slice(0,9).join(','),'Data/Hora,Evento,Nome,CPF,Telefone,E-mail,Funcao,NTE,Observacoes');['Municipio','Setor','Tipo','EventoNome'].forEach(c=>assert.equal(cabecalho.indexOf(c),-1,c));assert.equal(h.post(h.payload()).success,true);const linha=h.rows[0].raw;assert.equal(linha.Evento,'EPT');assert.equal(linha.EventoID,'ept');assert.equal(linha['Data/Hora'],'2026-09-18T12:00:00-03:00');assert.equal(linha['E-mail'],'teste@example.invalid');assert.equal(linha.Observacoes,'');assert.equal(linha.Nome,'=Teste literal');});
function painel(linhas, config, rows) {
  const escritas = [];
  const ctx = {RegistrationCore:core, PropertiesService:{getScriptProperties:()=>({getProperty:()=>'s'.repeat(40)})},
    LockService:{getScriptLock:()=>({waitLock:()=>true,releaseLock:()=>{}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
    SpreadsheetApp:{flush:()=>{}}, ScriptApp:{getProjectTriggers:()=>[]}};
  vm.createContext(ctx);
  carregaScript(ctx);
  ctx.database_=()=>({getSheetByName:nome=>nome!=='Vagas'?null:({
    getDataRange:()=>({getDisplayValues:()=>linhas}),
    getRange:(linha,coluna,n,m)=>({setValues:v=>escritas.push({linha,coluna,valores:v})})
  })});
  ctx.painelVagas_(config, rows);
  return escritas;
}
test('painel de vagas montado a mao recebe Inscritos e Disponiveis nos dois blocos',()=>{
  const salvador='Diretores, vice-diretores e coordenadores pedagógicos das unidades escolares de Salvador participantes da avaliação';
  const linhas=[
    ['EJA','','','','','EPT','','',''],
    ['Função / Instituição','Limite','Inscritos','Disponíveis','','Função / Instituição','Limite','Inscritos','Disponíveis'],
    ['Diretores dos NTE','27','','','','Diretores dos NTE','27','',''],
    ['SUPROT','5','','','','SUPROT','10','',''],
    ['SGINF/DIE','13','','','','SGINF/DIE','13','',''],
    [salvador,'90','','','',salvador,'90','',''],
    ['TOTAL','250','','','','TOTAL','250','','']
  ];
  const funcoes=[];
  ['ept','eja'].forEach(eventoId=>{
    [1,2,3].forEach(n=>funcoes.push({eventoId,id:`nte-0${n}-diretor`,nome:'Diretor(a)',tipo:'NTE',nte:`NTE 0${n}`,limite:1,grupo:`nte-0${n}-diretor`,ativa:true}));
    funcoes.push({eventoId,id:'suprot',nome:'SUPROT',tipo:'INSTITUCIONAL',limite:eventoId==='ept'?10:5,grupo:'suprot',ativa:true});
    funcoes.push({eventoId,id:'sginf-die',nome:'SGINF/DIE',tipo:'INSTITUCIONAL',setor:'SGINF',limite:13,grupo:'sginf-die',ativa:true});
    funcoes.push({eventoId,id:'gestao-escolar-salvador',nome:'Gestão Escolar - Salvador',tipo:'INSTITUCIONAL',limite:90,grupo:'gestao-escolar-salvador',ativa:true});
  });
  const config={eventos:[{id:'ept',nome:'EPT',limite:250},{id:'eja',nome:'EJA',limite:250}],funcoes,municipios:[]};
  const rows=[
    {eventoId:'eja',status:'CONFIRMADA',grupoVagas:'nte-01-diretor'},
    {eventoId:'eja',status:'CONFIRMADA',grupoVagas:'nte-03-diretor'},
    {eventoId:'eja',status:'CONFIRMADA',grupoVagas:'suprot'},
    {eventoId:'ept',status:'CONFIRMADA',grupoVagas:'sginf-die'},
    {eventoId:'ept',status:'CANCELADA',grupoVagas:'sginf-die'}
  ];
  const escritas=painel(linhas,config,rows);
  assert.equal(escritas.length,2);
  const eja=escritas.find(e=>e.coluna===3), ept=escritas.find(e=>e.coluna===8);
  assert.equal(eja.linha,3); assert.equal(ept.linha,3);
  // EJA: 2 dos 3 diretores de NTE, 1 de 5 na SUPROT, nada no resto, 3 no total
  assert.equal(JSON.stringify(eja.valores),JSON.stringify([[2,1],[1,4],[0,13],[0,90],[3,247]]));
  // EPT: so a inscricao confirmada de SGINF/DIE conta; a cancelada nao
  assert.equal(JSON.stringify(ept.valores),JSON.stringify([[0,3],[0,10],[1,12],[0,90],[1,249]]));
});
function monitor() {
  const escritas=[], formatos=[];
  const ctx={RegistrationCore:core, PropertiesService:{getScriptProperties:()=>({getProperty:()=>'s'.repeat(40)})},
    LockService:{getScriptLock:()=>({waitLock:()=>true,releaseLock:()=>{}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
    Utilities:{formatDate:()=>'18/09/2026 16:00:00'}, SpreadsheetApp:{flush:()=>{}}, ScriptApp:{getProjectTriggers:()=>[]},
    CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{},remove:()=>{}})}};
  vm.createContext(ctx);
  carregaScript(ctx);
  const encadeia=alvo=>new Proxy(alvo,{get:(o,k)=>k in o?o[k]:()=>encadeia(o)});
  const sheet={getMaxRows:()=>200,setFrozenRows:()=>{},setColumnWidth:()=>{},
    getRange:(linha,coluna,n,m)=>encadeia({setValues:v=>{escritas.push({linha,coluna,valores:v});return encadeia({});},
      setBackgrounds:c=>{formatos.push({linha,coluna,cores:c});return encadeia({});}})};
  ctx.database_=()=>({getSheetByName:()=>sheet,insertSheet:()=>sheet});
  return {ctx,escritas,formatos,sheet};
}
test('painel de monitoramento agrega os NTE por papel e marca a ocupacao em cor',()=>{
  const m=monitor();
  const funcoes=[];
  [1,2,3,4].forEach(n=>{
    funcoes.push({eventoId:'eja',id:`nte-0${n}-diretor`,nome:'Diretor(a)',tipo:'NTE',limite:1,grupo:`nte-0${n}-diretor`,ativa:true});
    funcoes.push({eventoId:'eja',id:`nte-0${n}-coordenador`,nome:'Coordenador(a) Pedagógico(a)',tipo:'NTE',limite:1,grupo:`nte-0${n}-coordenador`,ativa:true});
  });
  funcoes.push({eventoId:'eja',id:'iat',nome:'IAT',tipo:'INSTITUCIONAL',limite:8,grupo:'iat',ativa:true});
  const linhas=m.ctx.linhasMonitoramento_(funcoes);
  assert.equal(JSON.stringify(linhas.map(l=>l.rotulo)),JSON.stringify(['Diretores dos NTE','Coordenadores pedagógicos dos NTE','IAT']));
  assert.equal(linhas[0].funcoes.length,4);
  const inscritas=[{grupoVagas:'nte-01-diretor'},{grupoVagas:'nte-02-diretor'},{grupoVagas:'nte-03-diretor'},{grupoVagas:'nte-04-diretor'},{grupoVagas:'iat'}];
  const bloco=m.ctx.blocoMonitoramento_({id:'eja',nome:'EJA',limite:100},funcoes,inscritas);
  // rotulo, limite, inscritos, disponiveis, ocupacao
  assert.equal(JSON.stringify(bloco.corpo[0]),JSON.stringify(['Diretores dos NTE',4,4,0,1]));
  assert.equal(JSON.stringify(bloco.corpo[1]),JSON.stringify(['Coordenadores pedagógicos dos NTE',4,0,4,0]));
  assert.equal(JSON.stringify(bloco.corpo[2]),JSON.stringify(['IAT',8,1,7,0.125]));
  assert.equal(JSON.stringify(bloco.corpo[3]),JSON.stringify(['TOTAL',100,5,95,0.05]));
  assert.equal(bloco.cores[0][0],'#fdecec'); // lotado
  assert.equal(bloco.cores[2][0],'#e8f5ed'); // folgado
  assert.equal(m.ctx.corOcupacao_(8,10),'#fdf3e0'); // apertado
});
test('monitoramento escreve um bloco por evento, lado a lado',()=>{
  const m=monitor();
  const funcoes=['ept','eja'].map(eventoId=>({eventoId,id:'iat',nome:'IAT',tipo:'INSTITUCIONAL',limite:8,grupo:'iat',ativa:true}));
  const config={eventos:[{id:'ept',nome:'EPT',limite:250},{id:'eja',nome:'EJA',limite:250}],funcoes,municipios:[]};
  m.ctx.monitoramento_(config,[{eventoId:'ept',status:'CONFIRMADA',grupoVagas:'iat'}]);
  const cabecalho=m.escritas.find(e=>e.linha===5);assert.equal(JSON.stringify(cabecalho.valores[0]),JSON.stringify(['Função / Instituição','Limite','Inscritos','Disponíveis','Ocupação']));const corpos=m.escritas.filter(e=>e.linha===6);
  assert.equal(corpos.length,2);
  assert.equal(corpos[0].coluna,1); assert.equal(corpos[1].coluna,7);
  assert.equal(JSON.stringify(corpos[0].valores[0]),JSON.stringify(['IAT',8,1,7,0.125]));
  assert.equal(JSON.stringify(corpos[1].valores[0]),JSON.stringify(['IAT',8,0,8,0]));
});
test('prepararPlanilha funciona sem Municipios.gs: a aba nasce so com o cabecalho',()=>{
  const escritas=[], registro=[];
  const ctx={RegistrationCore:core,
    PropertiesService:{getScriptProperties:()=>({getProperty:()=>'s'.repeat(40)})},
    LockService:{getScriptLock:()=>({waitLock:()=>true,releaseLock:()=>{}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
    Utilities:{formatDate:()=>'21/09/2026 10:00:00'},SpreadsheetApp:{flush:()=>{}},
    ScriptApp:{getProjectTriggers:()=>[]},CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{},remove:()=>{}})},
    Logger:{log:t=>registro.push(String(t))}};
  vm.createContext(ctx);
  // So o catalogo de funcoes; CATALOGO_MUNICIPIOS fica indefinido de proposito.
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Catalogo.gs'),'utf8'),ctx);
  carregaScript(ctx);
  assert.equal(ctx.CATALOGO_MUNICIPIOS,undefined);
  const encadeia=alvo=>new Proxy(alvo,{get:(o,k)=>k in o?o[k]:()=>encadeia(o)});
  const folha=nome=>({getLastRow:()=>0,setFrozenRows:()=>{},setColumnWidths:()=>{},
    getRange:(linha,coluna,n,m)=>encadeia({setValues:v=>{escritas.push({nome,linha,valores:v});return encadeia({});}})});
  ctx.database_=()=>({getSheetByName:()=>null,insertSheet:nome=>folha(nome)});
  ctx.prepararPlanilha();
  const municipios=escritas.filter(e=>e.nome==='MunicipiosNTE');
  assert.equal(municipios.length,1); // so o cabecalho, nenhuma linha de dados
  assert.equal(municipios[0].linha,1);
  assert.equal(JSON.stringify(municipios[0].valores),JSON.stringify([['Municipio','NTE']]));
  // as demais abas continuam sendo semeadas normalmente
  const funcoes=escritas.filter(e=>e.nome==='Funcoes'&&e.linha===2)[0];
  assert.equal(funcoes.valores.length,196);
  const eventos=escritas.filter(e=>e.nome==='Eventos'&&e.linha===2)[0];
  assert.equal(eventos.valores.length,2);
  // a funcao avisa no registro o que ficou so com cabecalho
  assert.ok(registro.some(l=>l.includes('MunicipiosNTE (falta Municipios.gs)')),registro.join(' | '));
  assert.ok(!registro.some(l=>l.includes('falta Catalogo.gs')));
});
test('prepararPlanilha funciona so com os arquivos do script, sem catalogo nenhum',()=>{
  const escritas=[], registro=[];
  const ctx={RegistrationCore:core,
    PropertiesService:{getScriptProperties:()=>({getProperty:()=>'s'.repeat(40)})},
    LockService:{getScriptLock:()=>({waitLock:()=>true,releaseLock:()=>{}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
    Utilities:{formatDate:()=>'21/09/2026 10:00:00'},SpreadsheetApp:{flush:()=>{}},
    ScriptApp:{getProjectTriggers:()=>[]},CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{},remove:()=>{}})},
    Logger:{log:t=>registro.push(String(t))}};
  vm.createContext(ctx);
  carregaScript(ctx);
  assert.equal(ctx.CATALOGO_FUNCOES,undefined);
  assert.equal(ctx.CATALOGO_MUNICIPIOS,undefined);
  const encadeia=alvo=>new Proxy(alvo,{get:(o,k)=>k in o?o[k]:()=>encadeia(o)});
  const folha=nome=>({getLastRow:()=>0,setFrozenRows:()=>{},setColumnWidths:()=>{},
    getRange:(linha,coluna,n,m)=>encadeia({setValues:v=>{escritas.push({nome,linha,valores:v});return encadeia({});}})});
  ctx.database_=()=>({getSheetByName:()=>null,insertSheet:nome=>folha(nome)});
  ctx.prepararPlanilha();
  // as quatro abas nascem, Eventos com dados e as duas de catalogo so com cabecalho
  assert.equal(new Set(escritas.map(e=>e.nome)).size,4);
  assert.equal(escritas.filter(e=>e.nome==='Eventos'&&e.linha===2)[0].valores.length,2);
  assert.equal(escritas.filter(e=>e.nome==='Funcoes').length,1);
  assert.equal(escritas.filter(e=>e.nome==='MunicipiosNTE').length,1);
  assert.ok(registro.some(l=>l.includes('falta Catalogo.gs')),registro.join(' | '));
  assert.ok(registro.some(l=>l.includes('falta Municipios.gs')));
});
