import { useEffect, useMemo, useState } from 'react';
import Convert from 'ansi-to-html';
import { ansiToHtml, needsScreenEmulation } from '../lib/ansi-screen';

// escapeXML: true —— 同学代码的输出可能含 < > &，必须转义后再插进 DOM
const converter = new Convert({
  fg: 'currentColor',
  bg: 'transparent',
  newline: true,
  escapeXML: true,
  stream: false,
});

/**
 * 输出渲染分两条路径：
 * - 含光标/清屏/擦除指令（\033[H、\033[2J、\033[K…）→ 屏幕模拟器：
 *   在内存网格里逐帧覆盖，只渲染终态画面（动画类作品的正确形态）
 * - 普通输出 → ansi-to-html（支持 SGR 含 24bit 真彩色）
 */
export default function OutputPane({ result, status }) {
  const { stdout, stderr } = result || {};
  const [expanded, setExpanded] = useState(false);

  const stdoutHtml = useMemo(() => {
    if (!stdout) return '';
    return needsScreenEmulation(stdout)
      ? ansiToHtml(stdout)
      : converter.toHtml(stdout);
  }, [stdout]);

  const stderrHtml = useMemo(() => {
    if (!stderr) return '';
    return needsScreenEmulation(stderr)
      ? ansiToHtml(stderr)
      : converter.toHtml(stderr);
  }, [stderr]);

  const empty = !stdout && !stderr;

  // ESC 关闭放大层
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const preClass = 'mono text-[12px] leading-[1.6] text-ink';

  return (
    <div className="relative h-full overflow-auto">
      {status === 'timeout' && (
        <div className="flex items-center gap-1.5 border-b border-line-soft bg-warn/10 px-3 py-1.5 text-[11px] text-warn">
          执行超时，已强制终止
        </div>
      )}

      {empty ? (
        <div className="grid h-full place-items-center text-[11.5px] text-faint">
          {status === 'done' ? '程序没有输出' : '暂无输出'}
        </div>
      ) : (
        <>
          <div className="px-3 py-3 mono text-[12px] leading-[1.6] text-ink">
            {stdoutHtml && (
              <pre
                className={`whitespace-pre ${preClass}`}
                dangerouslySetInnerHTML={{ __html: stdoutHtml }}
              />
            )}
            {stderrHtml && (
              <pre
                className={`whitespace-pre-wrap break-words ${
                  stdoutHtml ? 'mt-2 border-t border-line-soft pt-2' : ''
                } text-danger`}
                dangerouslySetInnerHTML={{ __html: stderrHtml }}
              />
            )}
          </div>

          {/* 宽内容（ASCII 大字等）放大查看 */}
          {stdoutHtml && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              title="放大查看"
              aria-label="放大查看输出"
              className="absolute right-2 top-2 rounded-md border border-line bg-surface/90 px-2 py-0.5 text-[10.5px] text-muted backdrop-blur-sm transition-colors hover:text-ink"
            >
              ⤢ 放大
            </button>
          )}
        </>
      )}

      {expanded && stdoutHtml && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#0b0c0e]/95 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-[1100px] flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 text-[11px] text-faint">
              <span>输出 · 可横向滚动查看完整画面</span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-md border border-line px-2 py-0.5 text-muted transition-colors hover:text-ink"
              >
                关闭 (Esc)
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-bg p-4">
              <pre
                className={`whitespace-pre ${preClass}`}
                dangerouslySetInnerHTML={{ __html: stdoutHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
