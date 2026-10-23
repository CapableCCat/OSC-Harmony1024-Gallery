import { useCallback, useRef, useState } from 'react';
import { runPython } from '../lib/runners/python';

export const STATUS_META = {
  idle: { text: '待运行', dot: 'bg-faint', tone: 'text-muted' },
  waking: { text: '准备运行环境', dot: 'bg-warn animate-pulse', tone: 'text-warn' },
  running: { text: '运行中', dot: 'bg-accent animate-pulse', tone: 'text-accent' },
  done: { text: '已完成', dot: 'bg-accent', tone: 'text-muted' },
  error: { text: '运行报错', dot: 'bg-danger', tone: 'text-danger' },
  timeout: { text: '执行超时', dot: 'bg-warn', tone: 'text-warn' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 单张卡片的运行状态机。
 * 三种执行器共用同一套状态：idle → (waking) → running → done / error / timeout
 */
export function useRunner(work) {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (!work || busy.current) return;
    busy.current = true;
    setResult(null);

    try {
      if (work.runner === 'cached') {
        // 预执行回放：数据早就烘进 JSON 了，这里只做一点"在跑"的反馈
        setStatus('running');
        await sleep(420);

        const out = work.output;
        if (!out) {
          setResult({ ok: false, stdout: '', stderr: '这个作品没有预执行结果（C/C++ 需要先跑提取脚本）' });
          setStatus('error');
        } else {
          setResult({ ok: Boolean(out.ok), stdout: out.stdout || '', stderr: out.stderr || '' });
          setStatus(out.timeout ? 'timeout' : out.ok ? 'done' : 'error');
        }
      } else {
        const res = await runPython(work.code, {
          timeoutMs: 5000,
          onStatus: (s) => setStatus(s === 'waking' ? 'waking' : 'running'),
        });
        setResult(res);
        setStatus(res.timeout ? 'timeout' : res.ok ? 'done' : 'error');
      }
    } catch (err) {
      setResult({ ok: false, stdout: '', stderr: String(err?.message || err) });
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [work]);

  const reset = useCallback(() => {
    setResult(null);
    setStatus('idle');
  }, []);

  return { status, result, run, reset, meta: STATUS_META[status] || STATUS_META.idle };
}
