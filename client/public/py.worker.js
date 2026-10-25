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
 *   Worker → 主  { id, type: 'chunk', text }           运行中增量输出（仅"动画型"程序）
 *   Worker → 主  { id, type: 'result', ok, stdout, stderr }
 *   Worker → 主  { id, type: 'error', message }        加载失败等致命错误
 *
 * 增量输出（chunk）为什么存在：
 *   终端动画用 \033[H 逐帧重绘，如果只把最终 stdout 一次性交回去，
 *   前端只能看到最后一帧。动画型程序在跑的同时把每一批文本送出去，
 *   主线程就能边跑边刷新画面，和真终端一致。
 *   非动画型程序（普通 print）一律不流式，保持原有行为不变。
 */

const PYODIDE_VERSION = '0.27.7';
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** 自托管目录：与 worker 同级（/pyodide/） */
const LOCAL_BASE = new URL('pyodide/', self.location.href).href;

/** 判定"动画型"的窗口：只看开头这么多字符，避免误判/无限扫描 */
const PROBE_LIMIT = 4096;
/** 光标定位/清屏/擦除指令 —— 出现即认为画面会被重绘 */
const ANIM_RE = /\x1b\[[0-9;?]*[HJKABCEFGf]/;
/** 实时流式累计上限：超过就停止增量（仍需跑完拿全量结果），防止疯狂 print 打满主线程 */
const LIVE_LIMIT = 1024 * 1024;

let pyodide = null;
let initPromise = null;
let buf = { out: '', err: '' };

/** 当前这次运行的状态（用于把输出挂到正确的 id 上） */
let runId = null;
let live = { enabled: false, decided: false, sent: 0 };
let probe = '';

function resetBuf() {
  buf = { out: '', err: '' };
  runId = null;
  live = { enabled: false, decided: false, sent: 0 };
  probe = '';
}

/** 收一批 stdout：永远累积全量，动画型额外实时送出去 */
function emitOut(text) {
  buf.out += text;

  if (live.enabled) {
    if (live.sent + text.length > LIVE_LIMIT) {
      live.enabled = false; // 体积超限：放弃实时，结束时会拿到全量
      probe = '';
      return;
    }
    live.sent += text.length;
    self.postMessage({ id: runId, type: 'chunk', text });
    return;
  }

  if (live.decided) return;

  // 还在判定窗口内
  probe += text;
  if (ANIM_RE.test(probe)) {
    live.enabled = true;
    live.decided = true;
    live.sent = buf.out.length;
    // 把已经攒下的内容整段补发，前面几行不会丢
    self.postMessage({ id: runId, type: 'chunk', text: buf.out });
    probe = '';
    return;
  }
  if (probe.length > PROBE_LIMIT) {
    live.decided = true; // 判定结束：普通输出，不流式
    probe = '';
  }
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

    // batched 回调按行触发：同学代码里的 flush() 与换行都会把这一帧送出来
    pyodide.setStdout({
      batched: (text) => emitOut(text + '\n'),
    });
    pyodide.setStderr({
      batched: (text) => {
        buf.err += text + '\n';

        // 解释器崩溃时 runPythonAsync 永远不会 settle，只会干等到超时。
        // 这里第一时间上报，让前端能显示真实原因并立刻重置运行时。
        if (/Fatal Python error|Pyodide has suffered a fatal error|SuspendError/i.test(text)) {
          self.postMessage({ id: runId, type: 'fatal', message: text.trim() });
        }
      },
    });

    // 预热：把首次 import 的开销挪出用户的计时窗口。
    // 同学的动画作品普遍会 import os/sys/time/random，其中 random 最重。
    try {
      await pyodide.runPythonAsync('import os, sys, time, random');
    } catch {
      /* 预热失败不影响正常运行 */
    }

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
    runId = id;
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
    runId = null;
  }
};
