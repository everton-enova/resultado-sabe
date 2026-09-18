const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
/* Cada site publica um evento. EVENTO vem do projeto na Vercel e e gravado na pagina,
   para o visitante nao ver a cor errada antes do JavaScript rodar. */
const EVENTOS = {
  ept: { nome: 'EPT', cor: '#1a3a8a', linha: 'Educação Profissional e Tecnológica · SABE 2026', rodape: 'SABE 2026' },
  eja: { nome: 'EJA', cor: '#a32020', linha: 'Educação de Jovens e Adultos · SABE 2025/2026', rodape: 'SABE 2025/2026' }
};
/* Em producao EVENTO e obrigatorio: sem isso, esquecer a variavel no projeto do EJA
   publicaria o site do EPT no dominio errado, sem erro nenhum. Localmente, ept e o padrao. */
const naVercel = Boolean(process.env.VERCEL || process.env.CI);
const informado = String(process.env.EVENTO || '').trim().toLowerCase();
if (naVercel && !informado) throw new Error('EVENTO ausente. Defina EVENTO=ept ou EVENTO=eja nas variaveis do projeto.');
const evento = informado || 'ept';
if (!EVENTOS[evento]) throw new Error(`EVENTO invalido: ${process.env.EVENTO}. Use ept ou eja.`);
const { nome, cor, linha, rodape } = EVENTOS[evento];
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(root, 'dist'), { recursive: true });
const pagina = path.join(root, 'dist', 'index.html');
const html = fs.readFileSync(pagina, 'utf8')
  .replace(/data-evento="[^"]*"/, `data-evento="${evento}"`)
  .replace(/data-theme="[^"]*"/, `data-theme="${evento}"`)
  .replace(/<title>[^<]*<\/title>/, `<title>Inscrições • ${nome}</title>`)
  .replace(/(<meta name="theme-color" content=")[^"]*/, `$1${cor}`)
  .replace(/(<span class="highlight" id="event-title">)[^<]*/, `$1${nome}`)
  .replace(/(<span id="footer-event">)[^<]*/, `$1${nome}`)
  .replace(/(<p id="event-intro">)[^<]*/, `$1${linha}`)
  .replace(/(<span id="footer-event">[^<]*<\/span> <span>•<\/span> )[^<]*/, `$1${rodape}`);
fs.writeFileSync(pagina, html);
console.log(`Site do ${nome} preparado em dist/.`);
