/**
 * Move asset files under assets/ that are not referenced by any HTML/JSON/CSS
 * in the static site (including src/) into _archive/unreferenced-assets/<timestamp>/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const ASSET_RE = /assets\/([a-zA-Z0-9._-]+)/g;

const used = new Set();

function scanFile(filePath) {
  const t = fs.readFileSync(filePath, 'utf8');
  let m;
  ASSET_RE.lastIndex = 0;
  while ((m = ASSET_RE.exec(t)) !== null) {
    used.add(m[1]);
  }
}

function walk(rootDir, filter) {
  if (!fs.existsSync(rootDir)) return;
  for (const name of fs.readdirSync(rootDir)) {
    const p = path.join(rootDir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === '_archive' || name === 'node_modules') continue;
      walk(p, filter);
    } else if (filter(name)) {
      scanFile(p);
    }
  }
}

walk(root, (n) => /\.(html|json|css|mjs)$/.test(n));
walk(path.join(root, 'src'), (n) => /\.html$/.test(n));
walk(path.join(root, 'config'), (n) => /\.json$/.test(n));

used.add('tokens.css');

const assetsDir = path.join(root, 'assets');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destRoot = path.join(root, '_archive', 'unreferenced-assets', stamp);
let moved = 0;

for (const name of fs.readdirSync(assetsDir)) {
  const p = path.join(assetsDir, name);
  if (!fs.statSync(p).isFile()) continue;
  if (used.has(name)) continue;
  fs.mkdirSync(destRoot, { recursive: true });
  fs.renameSync(p, path.join(destRoot, name));
  moved++;
}

console.log(`Referenced ${used.size} asset names. Moved ${moved} unreferenced files to ${path.relative(root, destRoot)}`);
