import { useEffect, useMemo } from 'react';
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
 *   在内存网格里逐帧覆盖；运行/重播中由 liveHtml 提供当前画面，
 *   结束后用最终 stdout 重算一遍终态
 * - 普通输出 → ansi-to-html（支持 SGR 含 24bit 真彩色）
 *
 * liveHtml 为 null 表示"没有实时画面"；空串是合法值（重播刚开始画面就是空的）。
 * 全屏层只在单列（移动端）由卡片上的图标打开——多列时"整行展开"已覆盖同样的需求。
 */
export default function OutputPane({
  result,
  status,
  liveHtml,
  canReplay = false,
  replaying = false,
  onReplay,
  fullscreen = false,
  onClose,
  notice = '',
  onDismissNotice,
  canLandscape = false,
  onRequestLandscape,
}) {
  const { stdout, stderr } = result || {};

  const finalHtml = useMemo(() => {
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

  /* 实时画面（运行中/重播中）优先；否则用最终结果 */
  const stdoutHtml = liveHtml != null ? liveHtml : finalHtml;
  const empty = !stdoutHtml && !stderrHtml;

  // ESC 关闭全屏层
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, onClose]);

  const preClass = 'mono text-[12px] leading-[1.6] text-ink';

  return (
    <div className="relative h-full overflow-auto">
      {status === 'timeout' && (
        <div className="flex items-center gap-1.5 border-b border-line-soft bg-warn/10 px-3 py-1.5 text-[11px] text-warn">
          执行超时，已强制终止
        </div>
      )}

      {empty && !replaying ? (
        <div className="grid h-full place-items-center text-[11.5px] text-faint">
          {status === 'done' ? '程序没有输出' : '暂无输出'}
        </div>
      ) : (
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
      )}

      {/* 重播刚点下时画面是空的，这一层不能因为 stdoutHtml 为空就关掉 */}
      {fullscreen && (stdoutHtml || replaying) && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0c0e]/95 p-4" onClick={onClose}>
          <div
            className="mx-auto flex h-full w-full max-w-[1100px] flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-2 text-[11px] text-faint">
              <span className="truncate">输出 · 可横向滚动查看完整画面</span>
              <div className="flex shrink-0 items-center gap-2">
                {canLandscape && (
                  <button
                    type="button"
                    onClick={onRequestLandscape}
                    className="rounded-md border border-line px-2 py-0.5 text-muted transition-colors hover:text-ink"
                  >
                    横屏
                  </button>
                )}
                {canReplay && (
                  <button
                    type="button"
                    onClick={onReplay}
                    disabled={replaying}
                    title="按录制的时间轴重新播放动画（不重新执行代码）"
                    className="rounded-md border border-accent/50 px-2 py-0.5 text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-line disabled:text-faint"
                  >
                    {replaying ? '重播中' : '重播'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-line px-2 py-0.5 text-muted transition-colors hover:text-ink"
                >
                  关闭 (Esc)
                </button>
              </div>
            </div>
            {notice && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-line bg-surface/90 px-2.5 py-1.5 text-[11px] text-muted">
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={onDismissNotice}
                  className="shrink-0 text-faint transition-colors hover:text-ink"
                >
                  知道了
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-bg p-4">
              <pre
                className={`whitespace-pre ${preClass}`}
                dangerouslySetInnerHTML={{ __html: stdoutHtml || '' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
