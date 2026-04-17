/**
 * Resize + recompress rasters in assets/ for faster loads.
 * - Max dimension 2000px (fit inside, no upscale).
 * - JPEG / WebP: quality ~82.
 * - PNG without alpha: JPEG + reference updates.
 * - PNG with alpha: WebP if smaller than original, else compressed PNG; never grow file size.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets');

const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.JPG', '.PNG', '.JPEG']);

function walkForReplace(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '_archive') continue;
      walkForReplace(p, files);
    } else if (/\.(html|json|css|mjs|md)$/i.test(name.name)) {
      files.push(p);
    }
  }
  return files;
}

function applyRenames(fromName, toName) {
  const targets = walkForReplace(root);
  let n = 0;
  for (const file of targets) {
    let t = fs.readFileSync(file, 'utf8');
    const before = t;
    t = t.split(fromName).join(toName);
    if (t !== before) {
      fs.writeFileSync(file, t);
      n++;
    }
  }
  return n;
}

function buildPipeline(absPath, meta) {
  const maxDim = 2000;
  const w = meta.width || 0;
  const h = meta.height || 0;
  let p = sharp(absPath).rotate();
  if (w > maxDim || h > maxDim) {
    p = p.resize({
      width: w >= h ? maxDim : undefined,
      height: h > w ? maxDim : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  return p;
}

async function processFile(absPath) {
  const base = path.basename(absPath);
  const ext = path.extname(absPath);
  const extLower = ext.toLowerCase();
  const dir = path.dirname(absPath);
  const stem = path.basename(absPath, ext);

  const before = fs.statSync(absPath).size;
  const meta = await sharp(absPath).metadata();
  const pipeline = buildPipeline(absPath, meta);
  const tmp = absPath + '.__opt__tmp';

  if (extLower === '.png') {
    const hasAlpha = meta.hasAlpha === true;
    if (!hasAlpha) {
      await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
      const after = fs.statSync(tmp).size;
      if (after >= before) {
        fs.unlinkSync(tmp);
        console.log(`SKIP ${base} (jpeg not smaller)`);
        return;
      }
      const outName = `${stem}.jpg`;
      const outPath = path.join(dir, outName);
      fs.unlinkSync(absPath);
      fs.renameSync(tmp, outPath);
      const touched = applyRenames(base, outName);
      console.log(`PNG→JPEG ${base} → ${outName} (${before} → ${after} bytes, refs ${touched})`);
      return;
    }

    const webpBuf = await buildPipeline(absPath, meta).webp({ quality: 82, effort: 6 }).toBuffer();
    const pngBuf = await buildPipeline(absPath, meta).png({ compressionLevel: 9, effort: 6 }).toBuffer();
    if (webpBuf.length < before) {
      const outName = `${stem}.webp`;
      const outPath = path.join(dir, outName);
      fs.writeFileSync(tmp, webpBuf);
      fs.unlinkSync(absPath);
      fs.renameSync(tmp, outPath);
      const touched = applyRenames(base, outName);
      console.log(`PNG→WebP ${base} → ${outName} (${before} → ${webpBuf.length} bytes, refs ${touched})`);
      return;
    }
    if (pngBuf.length < before) {
      fs.writeFileSync(tmp, pngBuf);
      fs.renameSync(tmp, absPath);
      console.log(`OK ${base} (${before} → ${pngBuf.length} bytes)`);
      return;
    }
    console.log(`SKIP ${base} (alpha png/webp not smaller)`);
    return;
  }

  if (extLower === '.webp') {
    await pipeline.webp({ quality: 82, effort: 6 }).toFile(tmp);
  } else {
    await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
  }

  const after = fs.statSync(tmp).size;
  if (after >= before) {
    fs.unlinkSync(tmp);
    console.log(`SKIP ${base} (not smaller)`);
    return;
  }
  fs.renameSync(tmp, absPath);
  console.log(`OK ${base} (${before} → ${after} bytes)`);
}

const files = fs
  .readdirSync(assetsDir)
  .filter((n) => RASTER_EXT.has(path.extname(n)))
  .map((n) => path.join(assetsDir, n))
  .filter((p) => fs.statSync(p).isFile());

files.sort();
for (const p of files) {
  try {
    await processFile(p);
  } catch (e) {
    console.error('FAIL', path.basename(p), e.message);
    const tmp = p + '.__opt__tmp';
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    process.exitCode = 1;
  }
}
console.log('optimize-images done.');
