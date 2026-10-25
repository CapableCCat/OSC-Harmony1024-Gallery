import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import DistributionBar from './components/DistributionBar';
import WorkCard from './components/WorkCard';
import { EmptyGallery, SkeletonGrid, StateMessage } from './components/StatusScreen';
import { useWorks } from './hooks/useWorks';
import { warmupPython } from './lib/runners/python';
import { TOOLS_ALWAYS_VISIBLE } from './lib/ui-flags';

export default function App() {
  const { works, generatedAt, loading, error } = useWorks();
  const [lang, setLang] = useState('all');
  const [query, setQuery] = useState('');
  /* 入场动画只在首次加载播放；筛选/搜索产生的新卡片不再重播 */
  const [intro, setIntro] = useState(true);
  /* 放大的卡片：{ id, base: 原始下标, at: 渲染时插入的位置（所在行的行首） } */
  const [expanded, setExpanded] = useState(null);
  const gridRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1100);
    return () => clearTimeout(t);
  }, []);

  /* 预热：数据一到就开拉运行时，用户浏览卡片的时间足够下完 12MB */
  useEffect(() => {
    if (!works.some((w) => w.runner === 'pyodide')) return;

    // 首屏渲染完再下 12MB 运行时，避免和首屏抢主线程/带宽
    const start = () => warmupPython();
    if (window.requestIdleCallback) {
      const i = window.requestIdleCallback(start, { timeout: 6000 });
      return () => window.cancelIdleCallback?.(i);
    }
    const t = setTimeout(start, 4000);
    return () => clearTimeout(t);
  }, [works]);

  /* 编号跟随作品本体，不随筛选变动 */
  const orderOf = useMemo(() => {
    const map = new Map();
    works.forEach((w, i) => map.set(w.id, i + 1));
    return map;
  }, [works]);

  const counts = useMemo(() => {
    const acc = { all: works.length };
    for (const w of works) acc[w.language] = (acc[w.language] || 0) + 1;
    return acc;
  }, [works]);

  const shown = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return works.filter((w) => {
      if (lang !== 'all' && w.language !== lang) return false;
      if (!q) return true;
      return [w.author, w.title, w.filename, w.tag]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [works, lang, deferredQuery]);

  /* 当前可见作品（渲染顺序的基准），供 toggleExpand 计算行首时读取，避免闭包过期 */
  const shownRef = useRef(shown);
  shownRef.current = shown;

  /* 实测网格列数：grid-template-columns 解析后就是 "380px 380px 380px" 这种形式 */
  const measureCols = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return 1;
    const tracks = getComputedStyle(grid).gridTemplateColumns;
    const n = tracks.split(/\s+/).filter(Boolean).length;
    return Math.max(1, n || 1);
  }, []);

  /* 列数决定"放大"给哪个：1 列给全屏，多列给整行展开 */
  const [cols, setCols] = useState(1);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const read = () => {
      const n = measureCols();
      setCols((cur) => (cur === n ? cur : n));
      if (n === 1) setExpanded(null); // 单列没有"整行"可言
    };
    read();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [measureCols, shown.length]);

  /* 工具图标的显示策略开关：?tools=always 可强制常显（详见 lib/ui-flags） */
  useEffect(() => {
    document.documentElement.dataset.tools = TOOLS_ALWAYS_VISIBLE ? 'always' : 'hover';
  }, []);

  /**
   * 展开/收起。
   * 跨整行的卡片放不进它原来那一行，所以把它的**渲染顺序**提到所在行行首：
   * 它占满自己那一行，原本同行的卡片整行顺延——点了哪一行，就在哪一行放大。
   * 代价：放大期间编号会短暂不连续（收起即恢复）；这是"位置对齐"换来的一致性。
   */
  const toggleExpand = useCallback(
    (id) => {
      setExpanded((cur) => {
        if (cur && cur.id === id) return null;
        const base = shownRef.current.findIndex((w) => w.id === id);
        if (base < 0) return null;
        const cols = measureCols();
        return { id, base, at: Math.floor(base / cols) * cols };
      });
    },
    [measureCols]
  );

  /* 窗口宽度变化会改变列数，行首位置要跟着重算，否则会留空洞 */
  useEffect(() => {
    if (!expanded) return;
    const onResize = () => {
      const cols = measureCols();
      setExpanded((cur) => (cur ? { ...cur, at: Math.floor(cur.base / cols) * cols } : cur));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expanded?.id, measureCols]);

  /**
   * 视觉顺序：把放大的那张排到所在行行首。
   * 用 CSS `order` 而不是重排数组——重排数组会让 React 移动 DOM 节点，
   * iframe 卡被移动就会重新加载（学生作品闪一下重跑），这是不能接受的。
   */
  const positionOf = useMemo(() => {
    const map = new Map();
    shown.forEach((w, i) => map.set(w.id, i));
    if (!expanded) return map;

    const base = shown.findIndex((w) => w.id === expanded.id);
    if (base < 0) return map;

    const seq = shown.map((w) => w.id);
    seq.splice(base, 1);
    seq.splice(Math.min(expanded.at, seq.length), 0, expanded.id);
    seq.forEach((id, i) => map.set(id, i));
    return map;
  }, [shown, expanded]);

  const languageCount = useMemo(
    () => new Set(works.map((w) => w.language)).size,
    [works]
  );

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" />
      <Header total={works.length} languageCount={languageCount} />

      <FilterBar
        active={lang}
        onChange={setLang}
        query={query}
        onQueryChange={setQuery}
        counts={counts}
      />

      <DistributionBar counts={counts} total={works.length} />

      <main className="mx-auto max-w-[1280px] px-5 pb-20 pt-5 sm:px-8">
        {loading && <SkeletonGrid count={6} />}

        {!loading && error && (
          <StateMessage
            title="数据加载失败"
            desc={`读不到 data/works.json（${error}）。请先运行 npm run data 生成数据，或检查部署产物里是否包含该文件。`}
          />
        )}

        {!loading && !error && works.length === 0 && <EmptyGallery />}

        {!loading && !error && works.length > 0 && shown.length === 0 && (
          <StateMessage
            title="没有匹配的作品"
            desc={`当前筛选：${lang === 'all' ? '全部语言' : lang}${query ? ` / 「${query}」` : ''}`}
          />
        )}

        {shown.length > 0 && (
          /* 放大卡已被提到行首，不再需要 dense 补位（两套机制同时开会互相干扰） */
          <div
            ref={gridRef}
            data-grid-dim={expanded ? 'true' : 'false'}
            className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]"
          >
            {shown.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                order={orderOf.get(work.id) || 0}
                orderIndex={positionOf.get(work.id) ?? 0}
                intro={intro}
                expanded={expanded?.id === work.id}
                compact={cols <= 1}
                onToggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}

        <footer className="mt-10 border-t border-line pt-4 text-[11px] text-faint">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              共 {works.length} 件作品 · 显示 {shown.length} 件
            </span>
            <span>
              {generatedAt ? `数据生成于 ${new Date(generatedAt).toLocaleString('zh-CN')}` : '开发者模式'}
            </span>
          </div>
          <p className="mt-2">
            © 2026 天津中德开源鸿蒙社 · 本站由{' '}
            <a
              href="https://github.com/CapableCCat"
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
            >
              CapableCCat
            </a>{' '}
            与 GLM、DeepSeek 协作构建 · 祝所有程序员 1024 节日快乐
          </p>
        </footer>
      </main>
    </div>
  );
}
