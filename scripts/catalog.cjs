/* Executado para extrair apenas as listas públicas do código de referência. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'reference/codigo.gs'),'utf8');
const front = fs.readFileSync(path.join(root,'reference/index.html'),'utf8');
function literal(text, name, open, close) {
  const pattern = new RegExp('var\\s+' + name + '\\s*=\\s*(' + open + '[\\s\\S]*?' + close + ')\\s*;');
  const match = text.match(pattern);
  if (!match) throw new Error('Catálogo ausente: '+name);
  return vm.runInNewContext('('+match[1]+')', Object.create(null), {timeout:1000});
}
const municipalities = literal(source,'MUNICIPIO_NTE','\\{','\\}');
const institutions = literal(front,'VAGAS_LIMITES','\\{','\\}');
const roles = Object.keys(institutions).filter(n=>n!=='Secretário(a) Municipal').map((nome,i)=>({id:'instituicao-'+String(i+1).padStart(2,'0'),nome,tipo:'INSTITUCIONAL'}));
roles.push({id:'secretario-municipal',nome:'Secretário(a) Municipal',tipo:'MUNICIPAL',grupo:'representantes-municipais'}, {id:'tecnico-municipal',nome:'Técnico Municipal',tipo:'MUNICIPAL',grupo:'representantes-municipais'});
for(let n=1;n<=27;n++) for(const [key,nome] of [['diretor','Diretor(a)'],['ponto-focal','Ponto Focal']]) roles.push({id:`nte-${String(n).padStart(2,'0')}-${key}`,nome,tipo:'NTE',nte:`NTE ${String(n).padStart(2,'0')}`});
const cities=Object.entries(municipalities).map(([nome,n])=>({nome,nte:'NTE '+String(n).padStart(2,'0')}));
if(cities.length !== 417) throw new Error('Esperados 417 municípios; encontrados '+cities.length);
fs.writeFileSync(path.join(root,'apps-script/Catalogo.gs'), '// Catálogos públicos extraídos do repositório de referência. Limites antigos não são importados.\nvar CATALOGO_FUNCOES = '+JSON.stringify(roles,null,2)+';\nvar CATALOGO_MUNICIPIOS = '+JSON.stringify(cities,null,2)+';\n');
fs.writeFileSync(path.join(root,'public/catalogo.json'),JSON.stringify({funcoes:roles,municipios:cities.map(m=>m.nome)}));
console.log(`${roles.length} funções e ${cities.length} municípios extraídos.`);
