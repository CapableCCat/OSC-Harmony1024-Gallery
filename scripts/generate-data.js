#!/usr/bin/env node
/**
 * 数据构建脚本
 * ------------------------------------------------------------
 * 从同学的作品仓库（AtomGit：tsgu-osc-org/1024）提取作品，生成
 * client/public/data/works.json。
 *
 * 用法：
 *   node scripts/generate-data.js                          # 只输出 mock（本地开发）
 *   node scripts/generate-data.js --repo ../1024           # 提取真实作品 + mock
 *   node scripts/generate-data.js --repo ./works-repo --no-mock   # CI 用
 *
 * 参数：
 *   --repo <dir>        作品仓库本地路径
 *   --out <file>        输出路径（默认 client/public/data/works.json）
 *   --repo-url <base>   仓库地址前缀（默认 AtomGit 主干 URL）
 *   --concurrency <n>   编译并发数（默认 4）
 *   --no-mock           不合并 mock 数据
 *
 * 提取规则：
 *   - 递归扫描，跳过 .git / node_modules / .github 等目录
 *   - 作者 = 仓库内第一层目录名；标题优先取同目录 README 的一级标题
 *   - HTML：把同目录的 css / js / 图片内联成单文件（srcdoc 只能注一个文档）
 *   - Python / JS：直接存源码，前者由 Pyodide 在浏览器执行，后者在 iframe 跑
 *   - C / C++：本机 gcc/g++ 编译并运行，捕获 stdout/stderr（含 ANSI 颜色），
 *     编译 20s、运行 5s 超时，超时直接 kill 并标记「运行超时」
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DEFAULT = path.join(ROOT, 'client', 'public', 'data', 'works.json');

const ATOM_BASE = 'https://atomgit.com/tsgu-osc-org/1024/tree/main';

const MAX_CODE_BYTES = 256 * 1024;
const MAX_ASSET_BYTES = 300 * 1024;
const MAX_INLINE_TOTAL = 2 * 1024 * 1024;
const MAX_OUTPUT_CHARS = 20000;
const COMPILE_TIMEOUT_MS = 20000;
const RUN_TIMEOUT_MS = 5000;

const EXT_LANG = {
  '.html': 'html',
  '.htm': 'html',
  '.py': 'python',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.js': 'js',
  '.mjs': 'js',
};

const RUNNER_BY_LANGUAGE = {
  html: 'iframe',
  js: 'iframe',
  python: 'pyodide',
  c: 'cached',
  cpp: 'cached',
  other: 'cached',
};

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  '.idea',
  '.vscode',
  'node_modules',
  '__pycache__',
  'dist',
  'build',
  '.DS_Store',
]);

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { concurrency: 4 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-mock') out.noMock = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      out[key] = argv[++i];
    }
  }
  return out;
}

function usage() {
  console.log(`
用法：node scripts/generate-data.js [选项]

  --repo <dir>       作品仓库路径（不给则只输出 mock）
  --out <file>       输出文件（默认 client/public/data/works.json）
  --repo-url <base>  仓库链接前缀
  --concurrency <n>  编译并发数（默认 4）
  --no-mock          不合并 mock 数据
  --help             显示本帮助
`);
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

const cleanText = (value) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');

function truncate(text, max = MAX_OUTPUT_CHARS) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…（输出过长，已截断）`;
}

/**
 * 读文本：优先严格 UTF-8，失败则回退 GBK。
 * 同学在 Windows 用记事本 / 旧 IDE 保存的中文源码常是 GBK，
 * 直接按 utf8 读会变乱码；更麻烦的是 HTML 里的资源引用会解不出来，
 * 内联漏掉后沙箱里 404，作品直接白屏。
 */
const utf8Strict = new TextDecoder('utf-8', { fatal: true });

function decodeText(buf) {
  try {
    return cleanText(utf8Strict.decode(buf));
  } catch {
    try {
      return cleanText(new TextDecoder('gbk').decode(buf));
    } catch {
      return cleanText(buf.toString('utf8')); // 兜底：宁可乱码也不中断构建
    }
  }
}

function readText(file) {
  return decodeText(fs.readFileSync(file));
}

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function walk(dir, acc = []) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return acc;
  }

  for (const name of names) {
    const full = path.join(dir, name);
    let stat;
    try {
      stat = fs.lstatSync(full);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, acc);
      continue;
    }
    if (stat.isFile()) acc.push(full);
  }
  return acc;
}

/* ------------------------------------------------------------------ */
/* HTML 单文件内联                                                      */
/* ------------------------------------------------------------------ */

function readAsset(baseDir, ref, budget) {
  if (!ref) return null;
  if (/^(?:[a-z]+:)?\/\//i.test(ref) || /^(?:data|mailto|javascript):/i.test(ref)) return null;

  const cleanRef = decodeURIComponent(ref.split('?')[0].split('#')[0]).trim();
  if (!cleanRef) return null;

  const abs = path.resolve(baseDir, cleanRef);
  const rootAbs = path.resolve(baseDir);
  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) return null; // 禁止目录穿越

  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  if (stat.size > MAX_ASSET_BYTES) return null;
  if (budget.total + stat.size > MAX_INLINE_TOTAL) return null;

  const buf = fs.readFileSync(abs);
  budget.total += buf.length;
  return { abs, buf, ext: path.extname(abs).toLowerCase() };
}

function toDataUri(asset) {
  const mime = MIME[asset.ext] || 'application/octet-stream';
  return `data:${mime};base64,${asset.buf.toString('base64')}`;
}

/** 把 CSS 里引用本地图片的 url() 换成 base64 */
function inlineCssUrls(css, baseDir, budget) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (whole, _quote, ref) => {
    if (/^(?:[a-z]+:)?\/\//i.test(ref) || /^data:/i.test(ref)) return whole;
    const asset = readAsset(baseDir, ref, budget);
    return asset ? `url("${toDataUri(asset)}")` : whole;
  });
}

/**
 * 把 HTML 引用的同目录资源内联掉。
 * srcdoc 只能注入一个文档，外链的 css/js/图片在沙箱里会 404，作品会白屏。
 */
function inlineHtml(htmlPath) {
  const dir = path.dirname(htmlPath);
  const budget = { total: 0 };
  let html = readText(htmlPath);

  // <link rel="stylesheet" href="...">
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag)) return tag;
    const m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!m) return tag;
    const asset = readAsset(dir, m[1], budget);
    if (!asset) return tag;
    const css = inlineCssUrls(decodeText(asset.buf), path.dirname(asset.abs), budget);
    return `<style>\n${css}\n</style>`;
  });

  // <script src="..."></script>
  html = html.replace(/<script\b([^>]*)>\s*<\/script>/gi, (whole, attrs) => {
    const m = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!m) return whole;
    const asset = readAsset(dir, m[1], budget);
    if (!asset) return whole;
    const rest = attrs.replace(/\s*src\s*=\s*["'][^"']*["']/i, '').replace(/\/\s*$/, '');
    const code = decodeText(asset.buf).replace(/<\/script/gi, '<\\/script');
    return `<script${rest}>\n${code}\n</script>`;
  });

  // <img src> / <source src> / <video poster>
  html = html.replace(
    /(<(?:img|source|video|audio|image)\b[^>]*?\b(?:src|poster)\s*=\s*["'])([^"']+)(["'])/gi,
    (whole, head, ref, tail) => {
      const asset = readAsset(dir, ref, budget);
      return asset ? `${head}${toDataUri(asset)}${tail}` : whole;
    }
  );

  // <style> 块里的 url()
  html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_w, open, css, close) =>
    open + inlineCssUrls(css, dir, budget) + close
  );

  return { code: html, inlinedBytes: budget.total };
}

/* ------------------------------------------------------------------ */
/* C / C++ 编译执行                                                     */
/* ------------------------------------------------------------------ */

const compilerCache = new Map();

async function hasCompiler(bin) {
  if (compilerCache.has(bin)) return compilerCache.get(bin);
  let ok = false;
  try {
    await execFileAsync(bin, ['--version'], { timeout: 8000 });
    ok = true;
  } catch {
    ok = false;
  }
  compilerCache.set(bin, ok);
  return ok;
}

async function executeNative(language, file, id) {
  const cc = language === 'c' ? 'gcc' : 'g++';

  if (!(await hasCompiler(cc))) {
    return {
      ok: false,
      exitCode: null,
      timeout: false,
      stdout: '',
      stderr: `构建机未找到 ${cc}，该作品未预执行。CI 的 ubuntu-latest 自带编译器；Windows 本地需安装 MinGW 或 WSL。`,
    };
  }

  const srcDir = path.dirname(file);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'osc1024-'));
  const binPath = path.join(tmp, process.platform === 'win32' ? `${id}.exe` : `${id}.out`);

  try {
    // 编译：以源码目录为 cwd，保证 #include "xxx.h" 能解析
    try {
      await execFileAsync(cc, ['-O0', '-w', '-o', binPath, path.basename(file), '-lm'], {
        cwd: srcDir,
        timeout: COMPILE_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (err) {
      const timedOut = Boolean(err.killed);
      return {
        ok: false,
        exitCode: null,
        timeout: false,
        stdout: truncate(cleanText(err.stdout)),
        stderr: truncate(
          timedOut ? '编译超时（>20 秒）' : cleanText(err.stderr) || '编译失败（无错误输出）'
        ),
      };
    }

    // 运行：cwd 用临时目录，避免同学程序往作品仓库里写文件
    try {
      const { stdout, stderr } = await execFileAsync(binPath, [], {
        cwd: tmp,
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        killSignal: 'SIGKILL',
      });
      return {
        ok: true,
        exitCode: 0,
        timeout: false,
        stdout: truncate(cleanText(stdout)),
        stderr: truncate(cleanText(stderr)),
      };
    } catch (err) {
      const timedOut = Boolean(err.killed) || err.signal === 'SIGKILL';
      return {
        ok: false,
        exitCode: timedOut ? null : (err.code ?? 1),
        timeout: timedOut,
        stdout: truncate(cleanText(err.stdout)),
        stderr: timedOut
          ? '运行超过 5 秒，已强制终止（疑似死循环）'
          : truncate(cleanText(err.stderr)),
      };
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/* 作品扫描                                                             */
/* ------------------------------------------------------------------ */

function readTitle(dir) {
  for (const name of ['README.md', 'readme.md', 'Readme.md']) {
    const full = path.join(dir, name);
    if (!fs.existsSync(full)) continue;
    const text = readText(full).slice(0, 4000);
    const match = text.match(/^\s*#\s+(.+)$/m);
    if (match) return match[1].trim().slice(0, 60);
  }
  return '';
}

/**
 * 找出被 HTML 引用的本地文件（css/js/图片）。
 * 这些文件已经内联进 HTML，不能再单独算作一个作品，否则同一个提交会重复出现。
 */
function collectReferencedFiles(files) {
  const consumed = new Set();

  for (const file of files) {
    if (EXT_LANG[path.extname(file).toLowerCase()] !== 'html') continue;

    let text = '';
    try {
      text = readText(file);
    } catch {
      continue;
    }

    const dir = path.dirname(file);
    const re =
      /<(?:script|link|img|source|video|audio|image)\b[^>]*?\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = re.exec(text))) {
      const ref = match[1];
      if (/^(?:[a-z]+:)?\/\//i.test(ref) || /^data:/i.test(ref)) continue;
      const clean = decodeURIComponent(ref.split('?')[0].split('#')[0]).trim();
      if (!clean) continue;
      consumed.add(path.resolve(dir, clean));
    }
  }

  return consumed;
}

function scanRepo(repoDir, repoUrl) {
  const files = walk(repoDir).filter((file) => {
    const lang = EXT_LANG[path.extname(file).toLowerCase()];
    if (!lang) return false;
    try {
      if (fs.statSync(file).size > MAX_CODE_BYTES) return false;
    } catch {
      return false;
    }
    return true;
  });

  const consumed = collectReferencedFiles(files);

  return files
    .filter((file) => !consumed.has(path.resolve(file)))
    .map((file) => {
      const rel = path.relative(repoDir, file).split(path.sep).join('/');
      const parts = rel.split('/');
      const language = EXT_LANG[path.extname(file).toLowerCase()];
      const id = `r-${sha1(rel).slice(0, 8)}`;

      return {
        id,
        file,
        rel,
        language,
        author: parts.length > 1 ? parts[0] : path.basename(repoDir),
        title: readTitle(path.dirname(file)),
        filename: path.basename(file),
        repo_url: repoUrl ? `${repoUrl}/${parts.slice(0, -1).join('/')}` : '',
        dirKey: parts.slice(0, -1).join('/'),
      };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));
  }

/* ------------------------------------------------------------------ */
/* 主流程                                                               */
/* ------------------------------------------------------------------ */

function normalize(work, index) {
  const language = work.language || 'other';
  const runner = work.runner || RUNNER_BY_LANGUAGE[language] || 'cached';
  return {
    id: String(work.id || `w-${index + 1}`),
    author: String(work.author || '匿名'),
    title: work.title ? String(work.title) : '',
    filename: String(work.filename || ''),
    language,
    runner,
    code: String(work.code ?? ''),
    output: work.output || null,
    tag: work.tag ? String(work.tag) : '',
    repo_url: work.repo_url ? String(work.repo_url) : '',
    mock: Boolean(work.mock),
  };
}

async function loadMock({ noMock }) {
  const showMock = String(process.env.SHOW_MOCK ?? 'true').toLowerCase() !== 'false';
  if (noMock || !showMock) {
    console.log('[data] mock 已关闭');
    return [];
  }

  const mod = await import(pathToFileURL(path.join(ROOT, 'data', 'mock-works.mjs')).href);
  const all = mod.default || [];
  const enabled = all.filter((w) => w.enabled !== false);
  console.log(`[data] mock：${enabled.length} 条启用${all.length - enabled.length ? `，${all.length - enabled.length} 条已关闭` : ''}`);
  return enabled.map((w, i) => ({ ...normalize(w, i), mock: true }));
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;

  const lanes = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(lanes);
  return results;
}

async function extractFromRepo(repoDir, repoUrl, concurrency) {
  const entries = scanRepo(repoDir, repoUrl);
  if (!entries.length) {
    console.warn('[data] 仓库里没有识别到作品文件');
    return [];
  }

  console.log(`[data] 扫描到 ${entries.length} 个作品文件，开始处理…`);

  const native = entries.filter((e) => e.language === 'c' || e.language === 'cpp');
  const outputMap = new Map();

  if (native.length) {
    const results = await runPool(
      native,
      (entry) => executeNative(entry.language, entry.file, entry.id),
      concurrency
    );
    native.forEach((entry, i) => outputMap.set(entry.id, results[i]));

    const failed = results.filter((r) => !r.ok).length;
    console.log(`[data] C/C++ 预执行完成：${results.length} 个，失败/超时 ${failed} 个`);
  }

  const works = entries.map((entry, index) => {
    let code = '';
    if (entry.language === 'html') {
      const { code: inlined } = inlineHtml(entry.file);
      code = inlined;
    } else {
      code = readText(entry.file);
    }

    const work = normalize(
      {
        ...entry,
        code,
        output: outputMap.get(entry.id) || null,
      },
      index
    );

    // 同一目录下的多个文件共享作者与仓库链接，便于溯源
    return work;
  });

  return works;
}

function writeOut(works, outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  let generatedAt = new Date().toISOString();
  if (fs.existsSync(outFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      if (prev?.generatedAt && JSON.stringify(prev.works) === JSON.stringify(works)) {
        generatedAt = prev.generatedAt;
        console.log('[data] 数据无变化，保留原生成时间');
      }
    } catch {
      /* 旧文件损坏直接覆盖 */
    }
  }

  const payload = { generatedAt, count: works.length, works };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const byLang = works.reduce((acc, w) => {
    acc[w.language] = (acc[w.language] || 0) + 1;
    return acc;
  }, {});
  const byRunner = works.reduce((acc, w) => {
    acc[w.runner] = (acc[w.runner] || 0) + 1;
    return acc;
  }, {});

  console.log(`[data] 写出 ${works.length} 条 → ${path.relative(ROOT, outFile)}`);
  console.log(`[data] 语言分布 ${JSON.stringify(byLang)}`);
  console.log(`[data] 执行器分布 ${JSON.stringify(byRunner)}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const outFile = args.out ? path.resolve(args.out) : OUT_DEFAULT;
  const repoUrl = args['repo-url'] || ATOM_BASE;
  const concurrency = Number(args.concurrency) || 4;

  let works = [];

  if (args.repo) {
    const repoDir = path.resolve(args.repo);
    if (!fs.existsSync(repoDir) || !fs.statSync(repoDir).isDirectory()) {
      console.error(`[data] 作品仓库不存在：${repoDir}`);
      process.exit(1);
    }
    console.log(`[data] 作品仓库：${repoDir}`);
    works = await extractFromRepo(repoDir, repoUrl, concurrency);
  } else {
    console.log('[data] 未指定 --repo，只处理 mock 数据');
  }

  const mock = await loadMock({ noMock: Boolean(args.noMock) });
  works = [...works, ...mock];

  writeOut(works, outFile);
}

main().catch((err) => {
  console.error('[data] 构建失败:', err);
  process.exit(1);
});
