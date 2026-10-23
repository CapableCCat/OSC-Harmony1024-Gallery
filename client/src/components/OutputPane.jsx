import { useMemo } from 'react';
import Convert from 'ansi-to-html';

// escapeXML: true —— 同学代码的输出可能含 < > &，必须转义后再插进 DOM
const converter = new Convert({
  fg: 'currentColor',
  bg: 'transparent',
  newline: true,
  escapeXML: true,
  stream: false,
});

export default function OutputPane({ result, status }) {
  const { stdout, stderr } = result || {};

  const stdoutHtml = useMemo(() => (stdout ? converter.toHtml(stdout) : ''), [stdout]);
  const stderrHtml = useMemo(() => (stderr ? converter.toHtml(stderr) : ''), [stderr]);

  const empty = !stdout && !stderr;

  return (
    <div className="h-full overflow-auto">
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
        <div className="px-4 py-3.5 mono text-[12px] leading-[1.75] text-ink">
          {stdoutHtml && (
            <pre
              className="whitespace-pre-wrap break-words"
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
    </div>
  );
}
