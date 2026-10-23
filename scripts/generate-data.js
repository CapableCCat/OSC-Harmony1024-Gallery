/**
 * 数据构建脚本
 * ------------------------------------------------------------
 * 现在（优先级 1）：把 data/mock-works.mjs 里 enabled 的条目合并成
 *   client/public/data/works.json
 *
 * 下一轮（优先级 2）：加 --repo <本地仓库路径>，从 AtomGit 仓库
 *   递归扫描 → HTML 内联 → C/C++ 编译执行（5s 超时）→ 生成同一份 JSON。
 *
 * 用法：
 *   node scripts/generate-data.js              # mock 模式（默认）
 *   SHOW_MOCK=false node scripts/generate-data.js   # 全量关掉 mock
 *   node scripts/generate-data.js --repo "D:\tmp\1024"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'client', 'public', 'data', 'works.json');

/** 语言 → 执行器 + 默认元信息（前端只认这几个值） */
const RUNNER_BY_LANGUAGE = {
  html: 'iframe',
  js: 'iframe',
  python: 'pyodide',
  c: 'cached',
  cpp: 'cached',
  other: 'cached',
};

const LANGUAGE_ALIASES = {
  htm: 'html',
  xhtml: 'html',
  vue: 'html',
  javascript: 'js',
  mjs: 'js',
  node: 'js',
  py: 'python',
  python3: 'python',
  'c++': 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  cplusplus: 'cpp',
};

export function normalizeLanguage(raw) {
  const v = String(raw || '').trim().toLowerCase().replace(/^\./, '');
  const mapped = LANGUAGE_ALIASES[v] || v;
  return RUNNER_BY_LANGUAGE[mapped] ? mapped : 'other';
}

/**
 * 统一成前端契约。真实提取与 mock 都走这里，保证只有一种数据形状。
 */
function normalize(work, index) {
  const language = normalizeLanguage(work.language);
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

async function loadMock() {
  const showMock = String(process.env.SHOW_MOCK ?? 'true').toLowerCase() !== 'false';
  if (!showMock) {
    console.log('[data] SHOW_MOCK=false → 跳过全部 mock 数据');
    return [];
  }

  const mod = await import(pathToFileURL(path.join(ROOT, 'data', 'mock-works.mjs')).href);
  const all = mod.default || [];
  const enabled = all.filter((w) => w.enabled !== false);
  const off = all.length - enabled.length;

  console.log(`[data] mock: ${enabled.length} 条启用${off ? `，${off} 条已关闭` : ''}`);
  return enabled.map((w, i) => ({ ...normalize(w, i), mock: true }));
}

function writeOut(works) {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  // 数据没变就不刷新 generatedAt，避免每次构建都弄脏工作树
  let generatedAt = new Date().toISOString();
  if (fs.existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      if (prev?.generatedAt && JSON.stringify(prev.works) === JSON.stringify(works)) {
        generatedAt = prev.generatedAt;
        console.log('[data] 数据无变化，保留原生成时间');
      }
    } catch {
      /* 旧文件损坏则直接覆盖 */
    }
  }

  const payload = { generatedAt, count: works.length, works };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const byLang = works.reduce((acc, w) => {
    acc[w.language] = (acc[w.language] || 0) + 1;
    return acc;
  }, {});
  const byRunner = works.reduce((acc, w) => {
    acc[w.runner] = (acc[w.runner] || 0) + 1;
    return acc;
  }, {});

  console.log(`[data] 写出 ${works.length} 条 → ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`[data] 语言分布 ${JSON.stringify(byLang)}`);
  console.log(`[data] 执行器分布 ${JSON.stringify(byRunner)}`);
}

function readArg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
}

async function main() {
  const repo = readArg('--repo');
  if (repo) {
    console.error('[data] --repo 提取模式尚未实现（优先级 2）。当前请先跑 mock 模式。');
    process.exit(1);
  }

  const works = await loadMock();
  writeOut(works);
}

main().catch((err) => {
  console.error('[data] 构建失败:', err);
  process.exit(1);
});
