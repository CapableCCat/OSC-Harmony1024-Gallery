/**
 * 实时输出渲染器
 * ------------------------------------------------------------
 * 同学作品里的终端动画（\033[H 逐帧重绘）需要"边跑边画"：
 * Worker 每送来一批文本，就把它喂进增量终端，再把当前画面交给 React。
 *
 * 为什么用 requestAnimationFrame 合批：
 *   一帧画面可能是几十次 write（逐行 flush），如果每次都 setState，
 *   React 一秒要重渲染上百次。按动画帧合并后，最多每帧渲染一次，
 *   表现与真终端一致，主线程也不会被压满。
 */

import { createScreen } from './ansi-screen';

const schedule =
  typeof requestAnimationFrame === 'function'
    ? (fn) => requestAnimationFrame(fn)
    : (fn) => setTimeout(fn, 16);

const unschedule =
  typeof cancelAnimationFrame === 'function'
    ? (id) => cancelAnimationFrame(id)
    : (id) => clearTimeout(id);

/**
 * @param {(html: string) => void} onUpdate 每帧回调，参数是当前画面的 HTML
 */
export function createLiveOutput(onUpdate) {
  let screen = createScreen();
  let text = '';
  let raf = 0;
  let dirty = false;

  const flush = () => {
    raf = 0;
    if (!dirty) return;
    dirty = false;
    onUpdate(screen.toHtml());
  };

  return {
    /** 追加一批原始文本（由 Worker 按行送出） */
    push(chunk) {
      if (!chunk) return;
      text += chunk;
      screen.write(chunk);
      dirty = true;
      if (!raf) raf = schedule(flush);
    },
    /** 已收到的全部原始文本（超时时用来保留现场） */
    get text() {
      return text;
    },
    /** 停止渲染（运行结束时调用，避免尾帧把最终结果盖回去） */
    cancel() {
      if (raf) unschedule(raf);
      raf = 0;
      dirty = false;
    },
    /** 清空重来 */
    reset() {
      this.cancel();
      text = '';
      screen = createScreen();
    },
  };
}
