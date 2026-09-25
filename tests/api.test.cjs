const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/inscricoes.js');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};}
function ambiente(valores){const antes={};for(const k of Object.keys(valores)){antes[k]=process.env[k];if(valores[k]===undefined)delete process.env[k];else process.env[k]=valores[k];}return ()=>{for(const k of Object.keys(valores)){if(antes[k]===undefined)delete process.env[k];else process.env[k]=antes[k];}};}
const URL='https://teste.supabase.co', CHAVE='sb_publishable_teste';

test('API fecha quando o Supabase não está configurado',async()=>{
  const restaurar=ambiente({SUPABASE_URL:undefined,SUPABASE_ANON_KEY:undefined,EVENTO:'ept'});
  try{const res=response();await handler({method:'GET',headers:{}},res);
    assert.equal(res.statusCode,503);assert.equal(res.data.code,'NOT_CONFIGURED');assert.match(res.data.variavel,/SUPABASE_URL/);}
  finally{restaurar();}
});

test('API rejeita método não permitido',async()=>{
  const restaurar=ambiente({SUPABASE_URL:URL,SUPABASE_ANON_KEY:CHAVE});
  try{const res=response();await handler({method:'DELETE',headers:{}},res);assert.equal(res.statusCode,405);}
  finally{restaurar();}
});

test('API monta a configuração pública a partir das tabelas e contagens',async()=>{
  const restaurar=ambiente({SUPABASE_URL:URL,SUPABASE_ANON_KEY:CHAVE});
  const aberto=new Date(Date.now()-3600e3).toISOString(), fecha=new Date(Date.now()+3600e3).toISOString();
  const tabelas={
    '/eventos?select=*':[{id:'ept',nome:'EPT',data:'2026-10-07',local:'Fiesta',horario:'9h',status:'ABERTO',abertura:aberto,encerramento:fecha,limite_total:3,limite_municipio:1}],
    '/funcoes?select=*':[
      {evento_id:'ept',id:'nte-01-diretor',nome:'Diretor(a)',tipo:'NTE',nte:'NTE 01',setor:'',grupo_vagas:'nte-01-diretor',limite:1,ativa:true},
      {evento_id:'ept',id:'nte-01-ponto-focal',nome:'Ponto Focal do SABE',tipo:'NTE',nte:'NTE 01',setor:'',grupo_vagas:'nte-01-ponto-focal',limite:1,ativa:true},
      {evento_id:'ept',id:'nte-01-coordenador',nome:'Coordenador(a) Pedagógico(a)',tipo:'NTE',nte:'NTE 01',setor:'',grupo_vagas:'nte-01-coordenador',limite:1,ativa:true}],
    '/municipios?select=*':[],
    '/rpc/contagens_vagas':[{evento_id:'ept',grupo_vagas:'nte-01-diretor',municipio:'',total:1}]
  };
  const antigo=global.fetch;
  global.fetch=async(url)=>{const caminho=url.slice(url.indexOf('/rest/v1')+8);assert.ok(caminho in tabelas,'chamada inesperada: '+url);return {ok:true,json:async()=>tabelas[caminho]};};
  try{
    const res=response();await handler({method:'GET',headers:{}},res);
    assert.equal(res.statusCode,200);assert.equal(res.data.success,true);
    assert.equal(res.headers['Cache-Control'],'public, s-maxage=30, stale-while-revalidate=300');
    const evento=res.data.eventos[0];
    assert.equal(evento.estado,'ABERTO');assert.equal(evento.disponiveis,2);
    const porId=Object.fromEntries(evento.funcoes.map(f=>[f.id,f.disponiveis]));
    assert.equal(porId['nte-01-diretor'],0);
    assert.equal(porId['nte-01-ponto-focal'],1);
    assert.equal(porId['nte-01-coordenador'],1);
  }finally{global.fetch=antigo;restaurar();}
});

test('API encaminha a inscrição para a RPC e anota na planilha',async()=>{
  const restaurar=ambiente({SUPABASE_URL:URL,SUPABASE_ANON_KEY:CHAVE,APPS_SCRIPT_URL:'https://script.google.com/macros/s/x/exec',APPS_SCRIPT_SECRET:'s'.repeat(40)});
  const chamadas=[];
  const antigo=global.fetch;
  global.fetch=async(url,options)=>{
    if(url.includes('/rest/v1/rpc/inscrever')){
      const corpo=JSON.parse(options.body);
      chamadas.push({tipo:'inscrever',corpo});
      return {ok:true,json:async()=>({success:true,protocolo:'K7R2-9DQ',evento:'EPT',registro:{protocolo:'K7R2-9DQ',eventoId:'ept',eventoNome:'EPT',nome:'Teste',funcaoId:'nte-01-diretor',status:'CONFIRMADA'}})};
    }
    if(url.startsWith('https://script.google.com/')){chamadas.push({tipo:'anotar',corpo:JSON.parse(options.body)});return {ok:true,json:async()=>({success:true})};}
    throw new Error('url inesperada '+url);
  };
  try{
    const res=response();
    await handler({method:'POST',headers:{'content-type':'application/json'},body:{eventoId:'ept',nome:'Teste',cpf:'52998224725',telefone:'71999999999',email:'teste@example.invalid',funcaoId:'nte-01-diretor',municipio:'',requestId:'request-00000000001'}},res);
    assert.equal(res.statusCode,200);assert.equal(res.data.success,true);assert.equal(res.data.protocolo,'K7R2-9DQ');
    const inscricao=chamadas.find(c=>c.tipo==='inscrever');
    assert.equal(inscricao.corpo.p_cpf,'52998224725');
    assert.match(inscricao.corpo.p_canonical,/"ept"/);
    assert.equal(chamadas.some(c=>c.tipo==='anotar'),true);
  }finally{global.fetch=antigo;restaurar();}
});

test('API recusa inscrição inválida sem chamar o banco',async()=>{
  const restaurar=ambiente({SUPABASE_URL:URL,SUPABASE_ANON_KEY:CHAVE});
  const antigo=global.fetch;global.fetch=async()=>{throw new Error('não deveria chamar');};
  try{
    const res=response();
    await handler({method:'POST',headers:{'content-type':'application/json'},body:{eventoId:'ept',nome:'Teste',cpf:'123',telefone:'1',email:'x',funcaoId:'',municipio:'',requestId:'curto'}},res);
    assert.equal(res.statusCode,422);assert.equal(res.data.code,'INVALID_INPUT');
  }finally{global.fetch=antigo;restaurar();}
});

test('API devolve 503 quando a RPC falha',async()=>{
  const restaurar=ambiente({SUPABASE_URL:URL,SUPABASE_ANON_KEY:CHAVE});
  const antigo=global.fetch;global.fetch=async()=>({ok:false,status:500,text:async()=>'erro'});
  try{
    const res=response();
    await handler({method:'POST',headers:{'content-type':'application/json'},body:{eventoId:'ept',nome:'Teste',cpf:'52998224725',telefone:'71999999999',email:'teste@example.invalid',funcaoId:'nte-01-diretor',municipio:'',requestId:'request-00000000001'}},res);
    assert.equal(res.statusCode,503);assert.equal(res.data.code,'CONNECTION_ERROR');
  }finally{global.fetch=antigo;restaurar();}
});

test('API propaga o erro de negócio da RPC (vagas esgotadas)',async()=>{
  const restaurar=ambiente({SUPABASE_URL:URL,SUPABASE_ANON_KEY:CHAVE});
  const antigo=global.fetch;
  global.fetch=async(url)=>{
    if(url.includes('/rpc/inscrever'))return {ok:true,json:async()=>({success:false,code:'ROLE_SOLD_OUT',message:'As vagas desta função foram preenchidas.'})};
    throw new Error('url inesperada '+url);
  };
  try{
    const res=response();
    await handler({method:'POST',headers:{'content-type':'application/json'},body:{eventoId:'ept',nome:'Teste',cpf:'52998224725',telefone:'71999999999',email:'teste@example.invalid',funcaoId:'nte-01-diretor',municipio:'',requestId:'request-00000000001'}},res);
    assert.equal(res.statusCode,422);assert.equal(res.data.code,'ROLE_SOLD_OUT');
  }finally{global.fetch=antigo;restaurar();}
});
