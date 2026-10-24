import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import DistributionBar from './components/DistributionBar';
import WorkCard from './components/WorkCard';
import { EmptyGallery, SkeletonGrid, StateMessage } from './components/StatusScreen';
import { useWorks } from './hooks/useWorks';
import { warmupPython } from './lib/runners/python';

export default function App() {
  const { works, generatedAt, loading, error } = useWorks();
  const [lang, setLang] = useState('all');
  const [query, setQuery] = useState('');
  /* 入场动画只在首次加载播放；筛选/搜索产生的新卡片不再重播 */
  const [intro, setIntro] = useState(true);
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
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
            {shown.map((work) => (
              <WorkCard key={work.id} work={work} order={orderOf.get(work.id) || 0} intro={intro} />
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
