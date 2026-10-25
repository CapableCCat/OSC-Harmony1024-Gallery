import { useCallback, useEffect, useRef, useState } from 'react';
import { runPython } from '../lib/runners/python';
import { createLiveOutput } from '../lib/live-output';
import { createReplay } from '../lib/replay-output';

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
 *
 * liveHtml：运行中的实时画面。null 表示"没有实时画面"（用最终结果渲染），
 * 空串是合法值——重播刚开始时画面就是空的，不能被当成"没有"。
 * 有录制时（动画型作品）可通过 replay() 按原时间轴重放，不重新执行代码。
 */
export function useRunner(work) {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [liveHtml, setLiveHtml] = useState(null);
  const [replaying, setReplaying] = useState(false);
  const [canReplay, setCanReplay] = useState(false);
  const busy = useRef(false);
  const liveRef = useRef(null);
  const recordingRef = useRef(null);
  const replayRef = useRef(null);

  const stopReplay = useCallback(() => {
    if (!replayRef.current) return;
    replayRef.current.cancel();
    replayRef.current = null;
    setReplaying(false);
  }, []);

  /* 卸载时别留下时间轴定时器 */
  useEffect(() => () => {
    replayRef.current?.cancel();
    liveRef.current?.cancel();
  }, []);

  const run = useCallback(async () => {
    if (!work || busy.current) return;
    busy.current = true;
    stopReplay();
    setResult(null);
    setLiveHtml(null);
    setCanReplay(false);
    recordingRef.current = null;

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
        const live = createLiveOutput((html) => setLiveHtml(html));
        const recording = [];
        const started = performance.now();
        liveRef.current = live;

        let res;
        try {
          res = await runPython(work.code, {
            timeoutMs: 5000,
            onStatus: (s) => setStatus(s === 'waking' ? 'waking' : 'running'),
            onChunk: (text) => {
              if (liveRef.current !== live) return;
              recording.push({ t: performance.now() - started, text });
              live.push(text);
            },
          });
        } finally {
          live.cancel(); // 收尾：别让挂起的尾帧盖掉最终结果
          liveRef.current = null;
        }

        // 超时 / 报错时保留已经画出来的现场，比直接空白有用
        if (!res.stdout && live.text) res = { ...res, stdout: live.text };

        recordingRef.current = recording.length ? recording : null;
        setLiveHtml(null);
        setResult(res);
        setStatus(res.timeout ? 'timeout' : res.ok ? 'done' : 'error');
        setCanReplay(res.ok && recording.length > 0);
      }
    } catch (err) {
      setLiveHtml(null);
      setResult({ ok: false, stdout: '', stderr: String(err?.message || err) });
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [work, stopReplay]);

  /** 按录制时间轴重放动画（不重新执行代码） */
  const replay = useCallback(() => {
    const recording = recordingRef.current;
    if (!recording || !recording.length || busy.current || replayRef.current) return;

    setLiveHtml(''); // 从空白开始，和真实运行的第一帧一致
    setReplaying(true);

    const player = createReplay(
      recording,
      (html) => setLiveHtml(html),
      () => {
        replayRef.current = null;
        setReplaying(false);
        setLiveHtml(null); // 播完交还给最终结果（同一画面）
      }
    );
    replayRef.current = player;
    player.start();
  }, []);

  return {
    status,
    result,
    liveHtml,
    replaying,
    canReplay,
    run,
    replay,
    meta: STATUS_META[status] || STATUS_META.idle,
  };
}
