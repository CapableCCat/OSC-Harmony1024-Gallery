import { memo, useCallback, useEffect, useRef, useState } from 'react';
import LanguageBadge from './LanguageBadge';
import CodePane from './CodePane';
import OutputPane from './OutputPane';
import FrameStage from './FrameStage';
import { useRunner } from '../hooks/useRunner';
import { warmupPython } from '../lib/runners/python';
import { langMeta } from '../lib/languages';
import { NATIVE_FULLSCREEN } from '../lib/ui-flags';

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

/* 操作栏主按钮统一样式：同款绿色圆角（重播 / 运行 共用） */
const ACCENT_BTN =
  'shrink-0 whitespace-nowrap rounded-[5px] bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink shadow-[0_0_14px_-4px_var(--app-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';

/* 预览区右上角的工具图标：桌面悬停出现、触屏常显（行为在 index.css 的 .card-tools） */
const TOOL_BTN =
  'inline-flex size-7 items-center justify-center rounded-[5px] border border-line bg-surface/90 text-muted transition-colors hover:border-line-hover hover:text-ink';

/* 卡片放大/收起的动效：同一组关键帧正反用，且只有被操作的那一张会动 */
const CARD_IN = [
  { transform: 'scale(0.965)', opacity: 0.55 },
  { transform: 'scale(1)', opacity: 1 },
];
const CARD_OUT = [
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(0.965)', opacity: 0.55 },
];

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5H6a2 2 0 0 0-2 2v9" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* 四角朝外：放大 */
const IconExpand = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

/* 四角朝内：收起 */
const IconCollapse = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);


/**
 * @param {boolean} compact 网格只有一列（卡片已占满宽度）：此时「放大卡片」没有意义，
 *   改为提供全屏查看；多列时反过来——全屏与整行展开作用重合，只留整行展开。
 */
function WorkCard({ work, order = 0, orderIndex = 0, intro = false, expanded = false, compact = false, onToggleExpand }) {
  const meta = langMeta(work.language);
  const isFrame = work.runner === 'iframe';
  const { status, result, liveHtml, replaying, canReplay, run, replay } = useRunner(work);

  const busy = status === 'waking' || status === 'running';

  const [view, setView] = useState('code');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotateHint, setRotateHint] = useState(false);

  /* 打开全屏：先请求真全屏，再尝试锁定横屏。
     Android Chrome 通常能成；iOS Safari 基本不支持，就退回一条提示——
     不做 CSS 旋转那种假横屏，字体必糊。 */
  /* 打开放大层：只弹我们自己的遮罩。
     绝不请求浏览器全屏——那会把整个页面（连地址栏一起）顶成全屏，
     在开发者工具的设备模拟下尤其突兀。想要横屏由用户自己点遮罩里的按钮。 */
  const openFullscreen = useCallback(() => {
    if (busy) return; // 运行中不要触发视图切换，会打断解释器
    setFullscreen(true);
  }, [busy]);

  /* 用户主动点「横屏」时才请求全屏 + 锁定方向；失败就提示手动旋转 */
  const requestLandscape = useCallback(async () => {
    if (!NATIVE_FULLSCREEN) {
      setRotateHint(true);
      return;
    }
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    } catch {
      /* 不支持元素全屏，继续尝试锁方向 */
    }
    try {
      await screen.orientation?.lock?.('landscape');
      setRotateHint(false);
      return;
    } catch {
      /* iOS Safari 等：锁定会被拒绝 */
    }
    setRotateHint(true);
  }, []);

  /* 只有触屏设备才显示「横屏」按钮：桌面没有旋转这回事 */
  const [canLandscape, setCanLandscape] = useState(false);
  useEffect(() => {
    setCanLandscape(Boolean(window.matchMedia?.('(pointer: coarse)').matches));
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    setRotateHint(false);
    try {
      screen.orientation?.unlock?.();
    } catch {
      /* 忽略 */
    }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);
  const cardRef = useRef(null);
  const toggling = useRef(false);
  const animRef = useRef(null); // 当前卡片上由我们发起的动效，切向前先撤掉，避免两个动画抢同一属性


  /* 单列时已经没有"整行"可展开，保险起见把展开态收掉 */
  useEffect(() => {
    if (compact && expanded) onToggleExpand?.(work.id);
  }, [compact, expanded, onToggleExpand, work.id]);

  /* 有实时画面就立刻切到输出视图，否则动画会在遮罩后面播完 */
  useEffect(() => {
    if (result || liveHtml != null) setView('output');
  }, [result, liveHtml]);

  /* 离开输出视图就关掉全屏层：否则切回输出时会突然弹出一层 */
  useEffect(() => {
    if (view !== 'output' && fullscreen) setFullscreen(false);
  }, [view, fullscreen]);

  /* 展开：先把卡片带回视口，再只给它自己 220ms 的"长出来"动效。
     其他卡片瞬间补位——不做整片网格的布局动画（View Transitions 实测又卡又看不出重点）。 */
  useEffect(() => {
    if (!expanded) return;

    const el = cardRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'auto', block: 'nearest' });

    if (typeof el.animate !== 'function') return;
    const anim = el.animate(CARD_IN, { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
    animRef.current = anim;
    return () => {
      anim.cancel();
      animRef.current = null;
    };
  }, [expanded]);

  /**
   * 收起：先"缩一下淡出"再提交布局，落位后用同一组关键帧淡回来。
   * 宽度突变（整行 → 单列）没法用 CSS 过渡，只能靠这一前一后两段把跳变盖住。
   */
  const toggleCard = () => {
    const el = cardRef.current;

    if (!expanded || toggling.current || !el || typeof el.animate !== 'function') {
      onToggleExpand?.(work.id);
      return;
    }

    toggling.current = true;
    animRef.current?.cancel(); // 展开动画还没播完就点收起时，先撤掉它
    const out = el.animate(CARD_OUT, {
      duration: 150,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards', // 保持淡出状态跨过提交，避免闪一下满不透明的大卡
    });
    animRef.current = out;

    out.finished.then(
      () => {
        onToggleExpand?.(work.id);
        requestAnimationFrame(() => {
          const back = el.animate(CARD_IN, {
            duration: 200,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          });
          animRef.current = back;
          const done = () => {
            out.cancel();
            animRef.current = null;
            toggling.current = false;
          };
          back.finished.then(done, done);
        });
      },
      () => {
        toggling.current = false; // 被取消（组件卸载等）就不提交收起
      }
    );
  };

  async function onCopy() {
    const ok = await copyText(work.code || '');
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  /* 主按钮：未运行时触发执行；运行过之后在"源码"和"效果"之间切换 */
  const onPrimary = () => {
    if (result) setView((v) => (v === 'output' ? 'code' : 'output'));
    else run();
  };

  const primaryLabel = result ? (view === 'output' ? '源码' : '效果') : busy ? '运行中' : '运行';

  return (
    <article
      ref={cardRef}
      data-expanded={expanded ? 'true' : undefined}
      onPointerEnter={work.runner === 'pyodide' ? warmupPython : undefined}
      style={{
        /* 视觉顺序由 CSS order 控制：放大时把这张排到行首，DOM 不动 → iframe 不会重载 */
        order: orderIndex,
        ...(intro ? { animationDelay: `${Math.min(order, 12) * 22}ms` } : null),
      }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[10px] border bg-surface transition-colors hover:border-line-hover ${
        expanded ? 'border-accent/40 [grid-column:1/-1]' : 'border-line'
      } ${intro ? 'card-in' : ''}`}>
      {/* hover 时才出现的一像素强调线，作为克制的「通电」反馈 */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-accent/25 transition-colors duration-300 group-hover:bg-accent/70" />

      {/* 标题区：两行，语言与预留标签贴右，不额外占行 */}
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-baseline gap-2">
          <span className="mono shrink-0 text-[10px] font-medium tabular-nums leading-6 text-accent">
            {String(order).padStart(2, '0')}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-medium leading-6">
            {work.author}
          </h3>
          {work.mock && (
            <span
              title="示例数据，非真实提交"
              className="mono shrink-0 rounded-[3px] border border-line px-1.5 py-[3px] text-[9px] leading-none tracking-[.14em] text-faint"
            >
              示例
            </span>
          )}
          <LanguageBadge language={work.language} />
        </div>

        <div className="mt-0.5 flex items-baseline gap-2">
          {/* 标题本身就是仓库里那份作品的入口：语义最直接，也不额外占位 */}
          {work.repo_url ? (
            <a
              href={work.repo_url}
              target="_blank"
              rel="noreferrer noopener"
              title="在 AtomGit 打开这份作品"
              className="mono min-w-0 flex-1 truncate text-[11.5px] leading-4 text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {work.title || work.filename}
            </a>
          ) : (
            <p className="mono min-w-0 flex-1 truncate text-[11.5px] leading-4 text-faint">
              {work.title || work.filename}
            </p>
          )}
          {work.tag && (
            <span className="shrink-0 truncate text-[11px] leading-4 text-muted">{work.tag}</span>
          )}
        </div>
      </div>

      {/* 预览区：通栏、无内层边框（靠底色区分，不再套一层框）
          高度必须是**确定值**：里面的 pre / iframe / 输出区都靠 h-full 撑满，
          若这里只有 min-height，长代码会把整张卡顶高。内容超出一律内部滚动。 */}
      <div className="relative h-[240px] shrink-0 border-t border-line bg-surface-2">
        <span className="scan-line" />
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 size-2 border-l border-t border-accent/30" />
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 size-2 border-r border-t border-accent/30" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-10 size-2 border-b border-l border-accent/30" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 size-2 border-b border-r border-accent/30" />

        {isFrame ? (
          <FrameStage code={work.code} language={work.language} title={`${work.author} 的作品`} />
        ) : view === 'code' ? (
          <CodePane code={work.code} language={work.language} />
        ) : (
          <OutputPane
            result={result}
            status={status}
            liveHtml={liveHtml}
            canReplay={canReplay}
            replaying={replaying}
            onReplay={replay}
            fullscreen={fullscreen}
            onClose={closeFullscreen}
            canLandscape={canLandscape}
            onRequestLandscape={requestLandscape}
            notice={rotateHint ? '这个浏览器不支持自动横屏，请手动把设备转过来' : ''}
            onDismissNotice={() => setRotateHint(false)}
          />
        )}

        {/* 预览区右上角的工具：复制（两端都有）+ 放大（多列=整行展开，单列=全屏查看） */}
        <div className="card-tools absolute right-2 top-2 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCopy}
            data-tip={copied ? '已复制' : '复制代码'}
            aria-label={copied ? '已复制' : '复制代码'}
            className={`${TOOL_BTN} tip ${copied ? 'text-accent' : ''}`}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </button>

          {compact ? (
            !isFrame &&
            view === 'output' && (
              <button
                type="button"
                onClick={openFullscreen}
                disabled={busy}
                data-tip="全屏查看"
                aria-label="全屏查看输出"
                className={`${TOOL_BTN} tip disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <IconExpand />
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={toggleCard}
              aria-expanded={expanded}
              data-tip={expanded ? '收起' : '放大到整行'}
              aria-label={expanded ? '收起卡片' : '放大到整行'}
              className={`${TOOL_BTN} tip ${expanded ? 'border-accent/60 text-accent' : ''}`}
            >
              {expanded ? <IconCollapse /> : <IconExpand />}
            </button>
          )}
        </div>

        {/* 遮罩只挡"还没出画面"的阶段；一旦有实时输出就撤掉，让动画直接可见 */}
        {busy && liveHtml == null && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2.5 bg-surface-2/95 px-6 text-center">
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

      {/* 操作栏：提示 + 重播（有录制时）+ 视图切换 */}
      <div className="flex h-11 items-center gap-3 border-t border-line px-4 mono text-[11px]">
        <span className="min-w-0 flex-1 truncate text-faint">{meta.hint}</span>

        <div className="flex shrink-0 items-center gap-2">
          {/*"再看一遍"只有一个位置：有录制就回放（不执行代码），没有就重新执行 */}
          {canReplay ? (
            <button type="button" onClick={replay} disabled={replaying} className={ACCENT_BTN}>
              {replaying ? '重播中' : '重播'}
            </button>
          ) : (
            !isFrame &&
            result && (
              <button type="button" onClick={run} disabled={busy} className={ACCENT_BTN}>
                重跑
              </button>
            )
          )}

          {!isFrame && (
            <button type="button" onClick={onPrimary} disabled={busy} className={ACCENT_BTN}>
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(WorkCard);
