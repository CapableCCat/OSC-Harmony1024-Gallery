/**
 * Pyodide 执行 Worker（classic worker，放在 public/ 下，不参与打包）
 * ------------------------------------------------------------
 * 为什么必须放进 Worker：
 *   同学的 Python 可能写 while True，主线程一旦被占死，整页白屏且无法恢复；
 *   只有 Worker 才能被主线程 terminate() 强制回收。
 *
 * 协议：
 *   主 → Worker  { id, type: 'init' }
 *   主 → Worker  { id, type: 'run', code }
 *   Worker → 主  { id, type: 'ready' }                 运行时就绪
 *   Worker → 主  { id, type: 'result', ok, stdout, stderr }
 *   Worker → 主  { id, type: 'error', message }        加载失败等致命错误
 */

const PYODIDE_VERSION = '0.28.3';
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** 自托管目录：与 worker 同级（/pyodide/） */
const LOCAL_BASE = new URL('pyodide/', self.location.href).href;

let pyodide = null;
let initPromise = null;
let buf = { out: '', err: '' };

function resetBuf() {
  buf = { out: '', err: '' };
}

async function loadFrom(base) {
  self.importScripts(`${base}pyodide.js`);
  return self.loadPyodide({ indexURL: base });
}

async function init() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 优先自托管（同域、快）；文件缺失时退回 CDN 兜底
    try {
      pyodide = await loadFrom(LOCAL_BASE);
    } catch (localErr) {
      pyodide = await loadFrom(CDN_BASE);
    }

    pyodide.setStdout({
      batched: (text) => {
        buf.out += text + '\n';
      },
    });
    pyodide.setStderr({
      batched: (text) => {
        buf.err += text + '\n';
      },
    });

    return pyodide;
  })();

  return initPromise;
}

self.onmessage = async (event) => {
  const { id, type } = event.data || {};

  if (type === 'init') {
    try {
      await init();
      self.postMessage({ id, type: 'ready' });
    } catch (err) {
      initPromise = null;
      self.postMessage({ id, type: 'error', message: String(err?.message || err) });
    }
    return;
  }

  if (type === 'run') {
    const code = String(event.data?.code || '');
    try {
      await init();
    } catch (err) {
      initPromise = null;
      self.postMessage({ id, type: 'error', message: String(err?.message || err) });
      return;
    }

    resetBuf();
    let ok = true;
    let message = '';

    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      ok = false;
      message = String(err?.message || err);
    }

    // 统一用 \n 收尾，前端直接按纯文本渲染
    self.postMessage({
      id,
      type: 'result',
      ok,
      stdout: buf.out,
      stderr: ok ? buf.err : [buf.err, message].filter(Boolean).join('\n'),
    });
  }
};
