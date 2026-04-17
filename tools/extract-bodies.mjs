/**
 * One-time / refresh: extract <main> inner HTML from built pages into src/bodies/.
 * Run from repo: npm run extract-bodies (cwd: russells_static_site)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const bodiesDir = path.join(root, 'src', 'bodies');

const MAIN_RE = /<main class="pt-\[100px\] md:pt-\[144px\]">([\s\S]*?)<\/main>/;

const FOOTER_START =
  '<div class="relative flex flex-col lg:flex-row justify-between w-full items-start lg:items-end h-auto flex-1 gap-[4vw] lg:min-h-[486px]">';

function stripSharedFooter(inner) {
  const i = inner.indexOf(FOOTER_START);
  if (i === -1) return inner;
  return inner.slice(0, i);
}

const routes = [
  { file: 'index.html', out: 'home.html' },
  { file: 'why-russells/index.html', out: 'why-russells.html' },
  { file: 'online-vet/index.html', out: 'online-vet.html' },
  { file: 'faq/index.html', out: 'faq.html' },
  { file: 'ingredient-index/index.html', out: null, herbal: true },
  ...[
    'calm-season',
    'calm-mind',
    'calm-gut',
    'bundle-anxious',
    'bundle-active',
    'calm-skin',
    'calm-move',
    'calm-oral',
    'bundle-sensitive',
    'bundle-starter',
    'bundle-complete',
  ].map((slug) => ({
    file: `products/${slug}/index.html`,
    out: `products/${slug}.html`,
  })),
];

function splitHerbal(inner) {
  const gridOpen = '<div class="flex flex-row justify-center flex-wrap gap-6 mt-11 pb-[300px]">';
  const gi = inner.indexOf(gridOpen);
  if (gi === -1) throw new Error('Herbal grid opening not found');
  const contentStart = gi + gridOpen.length;
  const fi = inner.indexOf(
    '<div class="relative flex flex-col lg:flex-row justify-between',
    contentStart
  );
  if (fi === -1) throw new Error('Herbal footer block not found');
  let depth = 1;
  let pos = contentStart;
  while (pos < fi && depth > 0) {
    const nextOpen = inner.indexOf('<div', pos);
    const nextClose = inner.indexOf('</div>', pos);
    if (nextClose === -1 || nextClose > fi) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      pos = nextClose + 6;
    }
  }
  const intro = inner.slice(0, contentStart);
  const outro = inner.slice(pos);
  return { intro, outro };
}

function extractProductBody(html) {
  const m = html.match(MAIN_RE);
  if (!m) throw new Error('No <main> in product page');
  return m[1];
}

fs.mkdirSync(path.join(bodiesDir, 'products'), { recursive: true });

for (const r of routes) {
  const srcPath = path.join(root, r.file);
  if (!fs.existsSync(srcPath)) {
    console.warn('Skip missing:', r.file);
    continue;
  }
  const html = fs.readFileSync(srcPath, 'utf8');
  const m = html.match(MAIN_RE);
  if (!m) {
    console.warn('No main in', r.file);
    continue;
  }
  const inner = m[1];
  if (r.herbal) {
    const { intro, outro } = splitHerbal(inner);
    fs.writeFileSync(path.join(bodiesDir, 'ingredient-index.intro.html'), intro);
    const gridClose = '</div>';
    if (!outro.startsWith(gridClose)) {
      throw new Error('Expected herbal outro to start with grid </div>');
    }
    fs.writeFileSync(
      path.join(bodiesDir, 'ingredient-index.grid-close.html'),
      gridClose
    );
    console.log('Wrote ingredient-index intro/grid-close');
  } else if (r.file.startsWith('products/')) {
    let body = extractProductBody(html);
    body = stripSharedFooter(body);
    const outPath = path.join(bodiesDir, r.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, body);
    console.log('Wrote', r.out);
  } else {
    let body = stripSharedFooter(inner);
    if (r.out === 'home.html') {
      body += '</div>';
    }
    fs.writeFileSync(path.join(bodiesDir, r.out), body);
    console.log('Wrote', r.out);
  }
}

console.log('Done.');
