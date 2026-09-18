const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/inscricoes.js');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};}
test('API fecha quando a integração não está configurada',async()=>{const old=process.env.APPS_SCRIPT_URL;delete process.env.APPS_SCRIPT_URL;try{const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,503);assert.equal(res.data.code,'NOT_CONFIGURED');}finally{if(old)process.env.APPS_SCRIPT_URL=old;}});
test('API protege segredo, trata falhas e limita métodos',async()=>{const oldUrl=process.env.APPS_SCRIPT_URL,oldSecret=process.env.APPS_SCRIPT_SECRET,oldFetch=global.fetch;process.env.APPS_SCRIPT_URL='https://script.google.com/macros/s/test/exec';process.env.APPS_SCRIPT_SECRET='x'.repeat(40);try{
  let forwarded;global.fetch=async(url,options)=>{forwarded=JSON.parse(options.body);return {ok:true,json:async()=>({success:true,protocolo:'id',evento:'EPT'})};};
  let res=response();await handler({method:'POST',headers:{'content-type':'application/json'},body:{action:'config',secret:'client-secret',eventoId:'ept',nome:'Teste'}},res);assert.equal(forwarded.action,'inscrever');assert.equal(forwarded.secret,'x'.repeat(40));assert.equal(forwarded.data.secret,undefined);assert.equal(res.statusCode,200);
  res=response();await handler({method:'DELETE',headers:{}},res);assert.equal(res.statusCode,405);
  res=response();await handler({method:'POST',headers:{},body:{}},res);assert.equal(res.statusCode,400);
  global.fetch=async()=>{throw new Error('secret details');};res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,503);assert.ok(!JSON.stringify(res.data).includes('secret details'));
}finally{global.fetch=oldFetch;if(oldUrl)process.env.APPS_SCRIPT_URL=oldUrl;else delete process.env.APPS_SCRIPT_URL;if(oldSecret)process.env.APPS_SCRIPT_SECRET=oldSecret;else delete process.env.APPS_SCRIPT_SECRET;}});
test('API repete quando o redirecionamento do Apps Script transforma o POST em GET',async()=>{
  const oldUrl=process.env.APPS_SCRIPT_URL,oldSecret=process.env.APPS_SCRIPT_SECRET,oldFetch=global.fetch;
  process.env.APPS_SCRIPT_URL='https://script.google.com/macros/s/test/exec';process.env.APPS_SCRIPT_SECRET='x'.repeat(40);
  try{
    let chamadas=0;
    global.fetch=async()=>{chamadas++;return chamadas===1
      ? {ok:true,json:async()=>({success:false,code:'METHOD_NOT_ALLOWED',message:'Use a integração do site.'})}
      : {ok:true,json:async()=>({success:true,protocolo:'protocolo-1',evento:'EPT'})};};
    let res=response();await handler({method:'GET',headers:{}},res);
    assert.equal(chamadas,2);assert.equal(res.statusCode,200);assert.equal(res.data.protocolo,'protocolo-1');
    // Duas respostas ruins seguidas nao viram resposta de negocio: o visitante recebe falha de conexao.
    chamadas=0;global.fetch=async()=>{chamadas++;return {ok:true,json:async()=>({success:false,code:'METHOD_NOT_ALLOWED'})};};
    res=response();await handler({method:'GET',headers:{}},res);
    assert.equal(chamadas,3);assert.equal(res.statusCode,503);assert.equal(res.data.code,'CONNECTION_ERROR');
    // Falha de rede na primeira tentativa tambem e repetida.
    chamadas=0;global.fetch=async()=>{chamadas++;if(chamadas===1)throw new Error('rede');return {ok:true,json:async()=>({success:true,eventos:[],municipios:[]})};};
    res=response();await handler({method:'GET',headers:{}},res);
    assert.equal(chamadas,2);assert.equal(res.statusCode,200);
  }finally{global.fetch=oldFetch;if(oldUrl)process.env.APPS_SCRIPT_URL=oldUrl;else delete process.env.APPS_SCRIPT_URL;if(oldSecret)process.env.APPS_SCRIPT_SECRET=oldSecret;else delete process.env.APPS_SCRIPT_SECRET;}});
