/**
 * Python 执行器（主线程侧）
 * ------------------------------------------------------------
 * - 全局单例 Worker：Pyodide 只加载一次，所有卡片共用（避免每张卡各下一份 ~15MB 运行时）
 * - 串行队列：同一时刻只跑一段代码（Pyodide 单实例本就不支持并发）
 * - 硬超时：超时直接 terminate() 回收 Worker，下次运行自动重建
 * - 预热：页面空闲时调用 warmup()，用户点运行时大概率已就绪
 */

const WORKER_URL = `${import.meta.env.BASE_URL}py.worker.js`;

const RUN_TIMEOUT_MS = 5000;
const INIT_TIMEOUT_MS = 120000;

let worker = null;
let ready = false;
let loading = null;
let seq = 0;
let chain = Promise.resolve();
const pending = new Map();

function ensureWorker() {
  if (worker) return worker;

  worker = new Worker(WORKER_URL);

  worker.onmessage = (event) => {
    const msg = event.data || {};
    const slot = pending.get(msg.id);
    if (!slot) return;

    // 运行中的增量输出：只转发，不结束这次请求
    if (msg.type === 'chunk') {
      slot.onChunk?.(msg.text || '');
      return;
    }

    // 解释器致命错误：立即结束，不等超时（Worker 已经不可信，直接丢掉）
    if (msg.type === 'fatal') {
      pending.delete(msg.id);
      hardReset();
      slot.reject(Object.assign(new Error(msg.message || 'Python 运行时崩溃'), { code: 'FATAL' }));
      return;
    }

    if (msg.type === 'error') {
      pending.delete(msg.id);
      slot.reject(Object.assign(new Error(msg.message || 'Worker 错误'), { code: 'WORKER' }));
      return;
    }
    pending.delete(msg.id);
    slot.resolve(msg);
  };

  worker.onerror = (event) => {
    const err = Object.assign(new Error(event.message || 'Worker 崩溃'), { code: 'WORKER' });
    for (const slot of pending.values()) slot.reject(err);
    pending.clear();
    hardReset();
  };

  return worker;
}

function request(payload, timeoutMs, onChunk) {
  const w = ensureWorker();
  const id = ++seq;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Object.assign(new Error('timeout'), { code: 'TIMEOUT' }));
    }, timeoutMs);

    pending.set(id, {
      onChunk,
      resolve(value) {
        clearTimeout(timer);
        resolve(value);
      },
      reject(err) {
        clearTimeout(timer);
        reject(err);
      },
    });

    w.postMessage({ id, ...payload });
  });
}

function hardReset() {
  if (worker) worker.terminate();
  worker = null;
  ready = false;
  loading = null;
  for (const slot of pending.values()) {
    slot.reject(Object.assign(new Error('运行时已重建'), { code: 'RESET' }));
  }
  pending.clear();
}

async function ensureRuntime(onStatus) {
  if (ready) return;

  if (!loading) {
    onStatus?.('waking');
    loading = request({ type: 'init' }, INIT_TIMEOUT_MS)
      .then(() => {
        ready = true;
      })
      .catch((err) => {
        hardReset();
        if (err?.code === 'TIMEOUT') {
          throw new Error(
            'Python 运行时加载超时（约 12MB，取决于网速）。请检查网络后点"运行"重试，已下载部分会被浏览器缓存。'
          );
        }
        throw err;
      });
  }

  await loading;
}

/**
 * @param {string} code
 * @param {{ timeoutMs?: number, onStatus?: (s:'waking'|'running') => void,
 *           onChunk?: (text:string) => void }} [options]
 *   onChunk 只在"动画型"程序（含光标重绘指令）运行中触发，用于逐帧实时渲染
 * @returns {Promise<{ok:boolean, timeout:boolean, stdout:string, stderr:string}>}
 */
export function runPython(code, { timeoutMs = RUN_TIMEOUT_MS, onStatus, onChunk } = {}) {
  const task = async () => {
    await ensureRuntime(onStatus);
    onStatus?.('running');

    try {
      const res = await request({ type: 'run', code }, timeoutMs, onChunk);

      // 解释器崩溃（如 "Fatal Python error" / "SuspendError"）后 Worker 往往已经不可用，
      // 直接丢掉它，下一次运行会重建——否则这张卡会永久卡在报错上，连重试都没用。
      if (!res.ok && /Fatal Python error|Pyodide has suffered a fatal error|SuspendError/i.test(res.stderr || '')) {
        hardReset();
      }

      return { ok: Boolean(res.ok), timeout: false, stdout: res.stdout || '', stderr: res.stderr || '' };
    } catch (err) {
      if (err?.code === 'FATAL') {
        return {
          ok: false,
          timeout: false,
          stdout: '',
          stderr: `Python 运行时崩溃：${err.message}\n已重置运行环境，可以直接重跑。`,
        };
      }
      if (err?.code === 'TIMEOUT') {
        hardReset(); // 死循环没法打断，只能整只 Worker 扔掉
        return {
          ok: false,
          timeout: true,
          stdout: '',
          stderr: `执行超过 ${(timeoutMs / 1000).toFixed(0)} 秒，已强制终止（疑似死循环）`,
        };
      }
      throw err;
    }
  };

  const p = chain.then(task, task);
  chain = p.catch(() => {});
  return p;
}

/** 空闲预热：失败静默（真正点击运行时会再报错给用户） */
export function warmupPython() {
  if (ready || loading) return;
  ensureRuntime().catch(() => {});
}
