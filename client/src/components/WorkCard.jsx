import { useEffect, useState } from 'react';
import LanguageBadge from './LanguageBadge';
import CodePane from './CodePane';
import OutputPane from './OutputPane';
import FrameStage from './FrameStage';
import { useRunner } from '../hooks/useRunner';
import { langMeta } from '../lib/languages';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function WorkCard({ work, order }) {
  const meta = langMeta(work.language);
  const isFrame = work.runner === 'iframe';
  const { status, result, run, meta: statusMeta } = useRunner(work);

  const [view, setView] = useState('code');
  const [copied, setCopied] = useState(false);

  const busy = status === 'waking' || status === 'running';

  useEffect(() => {
    if (result) setView('output');
  }, [result]);

  async function onCopy() {
    const ok = await copyText(work.code || '');
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-line-hover">
      {/* 作者 / 文件名 / 语言 */}
      <div className="flex items-start gap-2">
        <span className="mono mt-[3px] w-4 shrink-0 text-[10px] tabular-nums text-faint">
          {String(order).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <h3 className="truncate text-[13.5px] font-medium leading-5">{work.author}</h3>
            {work.mock && (
              <span className="shrink-0 rounded border border-line px-1 text-[9px] leading-[14px] text-faint">
                示例
              </span>
            )}
          </div>
          <p className="mono truncate text-[11px] leading-4 text-faint">
            {work.title || work.filename}
          </p>
        </div>

        <LanguageBadge language={work.language} />
      </div>

      {/* 奖项位（无奖项也占位，保证同排对齐） */}
      <div className="flex h-5 items-center pl-6">
        {work.tag && <span className="truncate text-[10.5px] text-warn">{work.tag}</span>}
      </div>

      {/* 运行区 */}
      <div className="relative mt-1 flex min-h-[190px] flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface-2">
        {isFrame ? (
          <FrameStage code={work.code} language={work.language} title={`${work.author} 的作品`} />
        ) : (
          <>
            {result && (
              <div className="flex h-7 shrink-0 items-center gap-1 border-b border-line-soft px-2">
                <ViewTab active={view === 'code'} onClick={() => setView('code')}>
                  代码
                </ViewTab>
                <ViewTab active={view === 'output'} onClick={() => setView('output')}>
                  输出
                </ViewTab>
                <span className="ml-auto pr-1 text-[10px] text-faint">{meta.hint}</span>
              </div>
            )}

            <div className="relative min-h-0 flex-1">
              {view === 'code' ? (
                <CodePane code={work.code} language={work.language} />
              ) : (
                <OutputPane result={result} status={status} />
              )}

              <button
                type="button"
                onClick={run}
                disabled={busy}
                className="absolute bottom-2 right-2 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? '运行中' : result ? '重新运行' : '运行'}
              </button>
            </div>

            {busy && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-surface-2/95 px-6 text-center">
                <span className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" />
                <p className="text-[11px] text-ink">
                  {status === 'waking' ? '正在准备 Python 运行环境…' : '正在运行…'}
                </p>
                {status === 'waking' && (
                  <p className="max-w-[15rem] text-[10px] leading-4 text-faint">
                    首次约需加载 12MB 运行时，之后就绪即用
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 状态 / 源码 / 复制 */}
      <div className="mt-2.5 flex items-center gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 ${statusMeta.tone}`}>
          <i className={`size-1.5 rounded-full ${statusMeta.dot}`} />
          {statusMeta.text}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {work.repo_url && (
            <a
              href={work.repo_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              源码
            </a>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
    </article>
  );
}

function ViewTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-[10.5px] transition-colors ${
        active ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
