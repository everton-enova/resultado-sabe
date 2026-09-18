const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const handler = require('../api/inscricoes.js');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webp':'image/webp', '.png':'image/png' };
http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/inscricoes') {
    let raw = '';
    for await (const part of req) { raw += part; if (raw.length > 6000) { res.writeHead(413); res.end(); return; } }
    req.body = raw;
    res.status = n => { res.statusCode = n; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
    return handler(req,res);
  }
  let filename;
  try { filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); }
  catch (_) { res.writeHead(400); res.end(); return; }
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filename, (err,data) => {
    if (err) { res.writeHead(404); res.end('Arquivo não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(data);
  });
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Prévia: http://127.0.0.1:' + (process.env.PORT || 4173)));
