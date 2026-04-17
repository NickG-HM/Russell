/**
 * Parse ingredient-index/index.html (pre-build export) into config/herbal-items.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'ingredient-index', 'index.html');
const out = path.join(root, 'config', 'herbal-items.json');

const html = fs.readFileSync(src, 'utf8');
const gridOpen = '<div class="flex flex-row justify-center flex-wrap gap-6 mt-11 pb-[300px]">';
const gi = html.indexOf(gridOpen);
if (gi === -1) throw new Error('grid not found');
const contentStart = gi + gridOpen.length;
const fi = html.indexOf(
  '<div class="relative flex flex-col lg:flex-row justify-between',
  contentStart
);
const gridHtml = html.slice(contentStart, fi);

const cardRe =
  /<div style="opacity:0\.01;transform:translateY\(32px\)"><div class="flex flex-row w-\[358px\] md:w-\[409px\] h-\[500px\][\s\S]*?<\/div><\/div><\/div><\/div><\/div>/g;

const items = [];
let m;
while ((m = cardRe.exec(gridHtml)) !== null) {
  const block = m[0];
  const numM = block.match(
    /<p class="font-styrene tracking-2 text-xs font-bold">\[\x3c!-- --\x3e(\d+)\x3c!-- --\x3e\]<\/p>/
  );
  const swM = block.match(/style="background-color:([^"]+)"/);
  const iconM = block.match(
    /<img alt=""[^>]+src="([^"]+)"/
  );
  const nameM = block.match(
    /<p class="font-styrene tracking-5 text-\[18px\] font-bold mt-2">([^<]+)<\/p>/
  );
  const latinM = block.match(
    /<p class="text-xs font-styrene tracking-2 font-bold mt-2">([^<]+)<\/p>/
  );
  const descM = block.match(
    /<p class="text-sm mt-1">([\s\S]*?)<\/p>/
  );
  const bestM = block.match(
    /<div class="flex justify-between items-center"><p class="text-sm">([^<]+)<\/p>/
  );
  let icon = iconM ? iconM[1] : null;
  if (icon) {
    icon = icon
      .replace(/&amp;/g, '&')
      .replace(/\?width=90.*$/, '')
      .replace(/\.svg&.*/, '.svg');
    if (icon.includes('../assets/')) {
      icon = icon.replace('../assets/', '');
    }
  }
  items.push({
    index: numM ? parseInt(numM[1], 10) : items.length + 1,
    swatch: swM ? swM[1].trim() : '#888888',
    icon,
    name: nameM ? nameM[1].trim() : '',
    latin: latinM ? latinM[1].trim() : '',
    description: descM
      ? descM[1].replace(/\s+/g, ' ').trim()
      : '',
    bestFor: bestM ? bestM[1].trim() : '',
  });
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(items, null, 2));
console.log('Wrote', items.length, 'items to', path.relative(root, out));
