const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../apps-script/Core.js');
function harness() {
  let locked=false, writes=0, releases=0;
  const rows=[];
  const event={id:'ept',nome:'EPT',status:'ABERTO',abertura:'2020-01-01T00:00:00-03:00',encerramento:'2099-01-01T00:00:00-03:00',limite:1,limiteMunicipio:1};
  const config={eventos:[event],funcoes:[{eventoId:'ept',id:'inst',nome:'Instituição',tipo:'INSTITUCIONAL',limite:10,ativa:true}],municipios:[]};
  const context={RegistrationCore:core, PropertiesService:{getScriptProperties:()=>({getProperty:()=> 's'.repeat(40)})},
    LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;releases++;}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
    Utilities:{getUuid:()=> 'generated-protocol-'+(writes+1),formatDate:()=> '2026-09-18T12:00:00-03:00'},SpreadsheetApp:{flush:()=>{assert.equal(locked,true);}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8'),context);
  context.config_=()=>{assert.equal(locked,true);return config;};
  context.registrations_=()=>{assert.equal(locked,true);return rows;};
  context.database_=()=>({getSheetByName:()=>({getLastColumn:()=>context.HEADERS.Inscricoes.length,getLastRow:()=>rows.length+1,getRange:(r)=>({getDisplayValues:()=>[context.HEADERS.Inscricoes],setNumberFormat:()=>({setValues:values=>{assert.equal(locked,true);assert.ok(values[0].every(v=>v.startsWith("'")));const v=Object.fromEntries(context.HEADERS.Inscricoes.map((h,i)=>[h,values[0][i].slice(1)]));rows.push({id:v.InscricaoID,eventoId:v.EventoID,eventoNome:v.EventoNome,cpf:v.CPF,grupoVagas:v.GrupoVagas,status:v.Status,requestId:v.ChaveRequisicao,canonical:v.DadosRequisicao});writes++;}})})})});
  const payload=overrides=>({secret:'s'.repeat(40),action:'inscrever',data:{eventoId:'ept',nome:'=Teste literal',cpf:'52998224725',telefone:'71999999999',email:'teste@example.invalid',funcaoId:'inst',municipio:'',requestId:'request-00000000001',...overrides}});
  const post=p=>context.doPost({postData:{contents:JSON.stringify(p)}});
  return {context,rows,post,payload,get writes(){return writes;},get releases(){return releases;},hold(){locked=true;},unlock(){locked=false;}};
}
test('Apps Script relê e grava sob bloqueio; disputa da última vaga só grava uma linha',()=>{const h=harness();assert.equal(h.post(h.payload()).success,true);const other=h.post(h.payload({cpf:'11144477735',requestId:'request-00000000002'}));assert.equal(other.code,'SOLD_OUT');assert.equal(h.writes,1);assert.equal(h.releases,2);});
test('Apps Script recupera protocolo após reenvio sem duplicar linha',()=>{const h=harness();const first=h.post(h.payload());const next=h.post(h.payload());assert.equal(next.protocolo,first.protocolo);assert.equal(h.writes,1);});
test('requisição concorrente sem bloqueio disponível recebe resposta temporária',()=>{const h=harness();h.hold();assert.equal(h.post(h.payload()).code,'BUSY');assert.equal(h.writes,0);h.unlock();assert.equal(h.post(h.payload()).success,true);});
test('erro libera bloqueio e não expõe exceção; segredo errado não grava',()=>{const h=harness();const original=h.context.config_;h.context.config_=()=>{throw new Error('internal secret');};const result=h.post(h.payload());assert.equal(result.code,'INTERNAL_ERROR');assert.ok(!JSON.stringify(result).includes('internal secret'));assert.equal(h.releases,1);h.context.config_=original;assert.equal(h.post({...h.payload(),secret:'wrong'}).code,'UNAUTHORIZED');assert.equal(h.post(h.payload()).success,true);});
