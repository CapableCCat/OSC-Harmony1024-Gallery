/**
 * 录制回放
 * ------------------------------------------------------------
 * 运行动画型作品时，主线程已经把每一批输出连同到达时间记了下来。
 * 重播就是按这份时间轴把画面重新画一遍：**不重新执行同学代码**，
 * 不占 Pyodide，也不受网络/CPU 波动影响。
 *
 * 为什么不用 setTimeout 逐批调度：
 *   一次动画可能有几百批，几百个定时器既不准也浪费。
 *   这里用单个 requestAnimationFrame 循环，每帧把"时间已经到了的批次"一次性喂进去。
 */

import { createLiveOutput } from './live-output';

/**
 * @param {{t:number, text:string}[]} recording 录制的时间轴（t 为相对毫秒）
 * @param {(html: string) => void} onFrame 每帧画面
 * @param {() => void} [onDone] 播完回调
 */
export function createReplay(recording, onFrame, onDone) {
  const out = createLiveOutput(onFrame);
  let idx = 0;
  let raf = 0;
  let startAt = 0;
  let cancelled = false;

  const step = () => {
    if (cancelled) return;

    const elapsed = performance.now() - startAt;
    while (idx < recording.length && recording[idx].t <= elapsed) {
      out.push(recording[idx].text);
      idx += 1;
    }

    if (idx < recording.length) {
      raf = requestAnimationFrame(step);
      return;
    }

    // 最后一批已经喂进去了，但要等 live-output 把这帧画出来再算播完
    // （flush 的 rAF 比这里早注册，同一帧内会先执行）
    raf = requestAnimationFrame(() => {
      raf = 0;
      onDone?.();
    });
  };

  return {
    start() {
      cancelled = false;
      idx = 0;
      startAt = performance.now();
      raf = requestAnimationFrame(step);
    },
    cancel() {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      out.cancel();
    },
  };
}
