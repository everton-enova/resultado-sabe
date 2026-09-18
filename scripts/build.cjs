const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(root, 'dist'), { recursive: true });
console.log('Site preparado em dist/.');
