/**
 * 把 Pyodide 运行时下载到 client/public/pyodide/（自托管）
 * ------------------------------------------------------------
 * 为什么不用 CDN：实测 jsdelivr 到本机 8.6MB 的 wasm 要 50 秒，
 * 首屏点"运行"必然超时。自托管后同域加载，且能享受部署平台的 CDN 缓存。
 *
 * 用法：
 *   node scripts/vendor-pyodide.mjs           # 缺什么补什么
 *   node scripts/vendor-pyodide.mjs --force   # 全部重下
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.27.7';
const CDN = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'client',
  'public',
  'pyodide'
);

// Pyodide 运行时必需文件；不存在的会自动跳过（不同版本文件名有差异）
const FILES = [
  'pyodide.js',
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'pyodide.asm.data',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'packages.json',
  'repodata.json',
];

const force = process.argv.includes('--force');

async function download(name) {
  const target = path.join(OUT_DIR, name);
  if (!force && fs.existsSync(target) && fs.statSync(target).size > 0) {
    return { name, skipped: true, size: fs.statSync(target).size };
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(CDN + name, { redirect: 'follow' });
      if (!res.ok) return { name, missing: true, code: res.status };

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error('空响应');
      fs.writeFileSync(target, buf);
      return { name, size: buf.length };
    } catch (err) {
      lastErr = err;
      // 大文件跨境下载偶发中断，退避重试
      await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }
  throw lastErr;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[vendor] pyodide v${VERSION} → ${path.relative(process.cwd(), OUT_DIR)}`);

  let total = 0;
  for (const name of FILES) {
    try {
      const r = await download(name);
      if (r.missing) {
        console.log(`[vendor] ${name.padEnd(20)} 跳过（${r.code}）`);
        continue;
      }
      total += r.size;
      console.log(
        `[vendor] ${name.padEnd(20)} ${r.skipped ? '已存在' : '下载完成'} ${(r.size / 1024 / 1024).toFixed(2)}MB`
      );
    } catch (err) {
      console.error(`[vendor] ${name} 失败：${err.message}`);
    }
  }

  const essential = ['pyodide.js', 'pyodide.asm.wasm', 'python_stdlib.zip'];
  const missing = essential.filter((f) => !fs.existsSync(path.join(OUT_DIR, f)));
  if (missing.length) {
    console.error(`[vendor] 缺少关键文件：${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`[vendor] 完成，共 ${(total / 1024 / 1024).toFixed(2)}MB`);
}

main();
