import { memo, useEffect, useState } from 'react';
import LanguageBadge from './LanguageBadge';
import CodePane from './CodePane';
import OutputPane from './OutputPane';
import FrameStage from './FrameStage';
import { useRunner } from '../hooks/useRunner';
import { warmupPython } from '../lib/runners/python';
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

function WorkCard({ work }) {
  const meta = langMeta(work.language);
  const isFrame = work.runner === 'iframe';
  const { status, result, run } = useRunner(work);

  const [view, setView] = useState('code');
  const [expanded, setExpanded] = useState(false);
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

  const runLabel = busy ? '运行中' : result ? '重跑' : '运行';

  return (
    <article
      onPointerEnter={work.runner === 'pyodide' ? warmupPython : undefined}
      className="group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-line bg-surface transition-colors hover:border-line-hover">
      {/* hover 时才出现的一像素强调线，作为克制的「通电」反馈 */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-accent/25 transition-colors duration-300 group-hover:bg-accent/70" />
      {/* 标题区：两行，语言与奖项贴右，不额外占行 */}
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-medium leading-6">
            {work.author}
          </h3>
          <LanguageBadge language={work.language} />
        </div>

        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="mono min-w-0 flex-1 truncate text-[11.5px] leading-4 text-faint">
            {work.title || work.filename}
          </p>
          {work.tag && (
            <span className="shrink-0 truncate text-[11px] leading-4 text-muted">{work.tag}</span>
          )}
        </div>
      </div>

      {/* 预览区：通栏、无内层边框（靠底色区分，不再套一层框） */}
      <div className="relative min-h-[240px] flex-1 border-t border-line bg-surface-2">
        {isFrame ? (
          <FrameStage code={work.code} language={work.language} title={`${work.author} 的作品`} />
        ) : view === 'code' ? (
          <CodeView code={work.code} language={work.language} expanded={expanded} onExpand={() => setExpanded(true)} />
        ) : (
          <OutputPane result={result} status={status} />
        )}

        {busy && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-surface-2/95 px-6 text-center">
            <span className="size-5 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="text-[12px] text-ink">
              {status === 'waking' ? '正在准备 Python 运行环境…' : '正在运行…'}
            </p>
            {status === 'waking' && (
              <p className="max-w-[16rem] text-[11px] leading-4 text-faint">
                首次约需加载 12MB 运行时，之后就绪即用
              </p>
            )}
          </div>
        )}
      </div>

      {/* 唯一操作栏 */}
      <div className="flex h-11 items-center gap-4 border-t border-line px-4 mono text-[11px]">
        {result ? (
          <button
            type="button"
            onClick={() => setView(view === 'code' ? 'output' : 'code')}
            className="text-muted transition-colors hover:text-ink"
          >
            {view === 'code' ? '查看输出' : '查看代码'}
          </button>
        ) : (
          <span className="truncate text-faint">{meta.hint}</span>
        )}

        <div className="ml-auto flex items-center gap-5">
          {work.repo_url && (
            <a
              href={work.repo_url}
              target="_blank"
              rel="noreferrer noopener"
              className="shrink-0 underline-offset-4 transition-colors hover:text-ink hover:underline"
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

          {!isFrame && (
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="shrink-0 whitespace-nowrap rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {runLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** 代码超过 8 行时默认只露前 8 行，底部渐隐 + 一个展开按钮 */
function CodeView({ code, language, expanded, onExpand }) {
  const isLong = String(code || '').split('\n').length > 8;
  const collapsed = isLong && !expanded;

  return (
    <div className="relative h-full">
      <div className={collapsed ? 'h-full max-h-[150px] overflow-hidden' : 'h-full'}>
        <CodePane code={code} language={language} />
      </div>

      {collapsed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-surface-2 via-surface-2/85 to-transparent pb-2 pt-8">
          <button
            type="button"
            onClick={onExpand}
            className="pointer-events-auto rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] text-muted transition-colors hover:text-ink"
          >
            展开全部
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(WorkCard);
