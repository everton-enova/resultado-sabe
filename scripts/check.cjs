const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
for (const dir of ['apps-script','api','public']) {
  for (const file of fs.readdirSync(path.join(__dirname,'..',dir))) {
    if (/\.(js|gs)$/.test(file)) new vm.Script(fs.readFileSync(path.join(__dirname,'..',dir,file),'utf8'), {filename:file});
  }
}
console.log('Sintaxe dos arquivos validada.');
