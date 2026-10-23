/**
 * 自托管字体：IBM Plex Sans + IBM Plex Mono（仅 latin 子集，中文回落到系统字体）
 * ------------------------------------------------------------
 * 为什么不用 Google Fonts CDN：国内访问不稳定，首屏可能 FOUT/超时。
 * 只取 latin 子集（每个 15~23KB），中文交给 PingFang / 微软雅黑，体积可控。
 *
 * 用法：node scripts/vendor-fonts.mjs [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'client',
  'public',
  'fonts'
);

const FONTS = [
  ['@fontsource/ibm-plex-sans@5.2.6', 'ibm-plex-sans-latin-400-normal.woff2'],
  ['@fontsource/ibm-plex-sans@5.2.6', 'ibm-plex-sans-latin-500-normal.woff2'],
  ['@fontsource/ibm-plex-sans@5.2.6', 'ibm-plex-sans-latin-600-normal.woff2'],
  ['@fontsource/ibm-plex-mono@5.2.6', 'ibm-plex-mono-latin-400-normal.woff2'],
  ['@fontsource/ibm-plex-mono@5.2.6', 'ibm-plex-mono-latin-500-normal.woff2'],
];

const force = process.argv.includes('--force');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;

  for (const [pkg, file] of FONTS) {
    const target = path.join(OUT_DIR, file);
    if (!force && fs.existsSync(target) && fs.statSync(target).size > 0) {
      total += fs.statSync(target).size;
      console.log(`[fonts] ${file} 已存在`);
      continue;
    }

    const url = `https://cdn.jsdelivr.net/npm/${pkg}/files/${file}`;
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(target, buf);
        total += buf.length;
        ok = true;
        console.log(`[fonts] ${file} ${(buf.length / 1024).toFixed(1)}KB`);
      } catch (err) {
        if (attempt === 3) console.error(`[fonts] ${file} 失败：${err.message}`);
        else await new Promise((r) => setTimeout(r, attempt * 600));
      }
    }
  }

  console.log(`[fonts] 合计 ${(total / 1024).toFixed(1)}KB`);
}

main();
