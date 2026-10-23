import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import WorkCard from './components/WorkCard';
import { SkeletonGrid, StateMessage } from './components/StatusScreen';
import { useWorks } from './hooks/useWorks';
import { warmupPython } from './lib/runners/python';

export default function App() {
  const { works, generatedAt, loading, error } = useWorks();
  const [lang, setLang] = useState('all');
  const [query, setQuery] = useState('');

  /* 预热：数据一到就开拉运行时，用户浏览卡片的时间足够下完 12MB */
  useEffect(() => {
    if (!works.some((w) => w.runner === 'pyodide')) return;
    warmupPython();
  }, [works]);

  const counts = useMemo(() => {
    const acc = { all: works.length };
    for (const w of works) acc[w.language] = (acc[w.language] || 0) + 1;
    return acc;
  }, [works]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works.filter((w) => {
      if (lang !== 'all' && w.language !== lang) return false;
      if (!q) return true;
      return [w.author, w.title, w.filename, w.tag]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [works, lang, query]);

  const languageCount = useMemo(
    () => new Set(works.map((w) => w.language)).size,
    [works]
  );

  return (
    <div className="min-h-screen">
      <Header total={works.length} languageCount={languageCount} />

      <FilterBar
        active={lang}
        onChange={setLang}
        query={query}
        onQueryChange={setQuery}
        counts={counts}
      />

      <main className="mx-auto max-w-[1280px] px-5 pb-20 pt-5 sm:px-8">
        {loading && <SkeletonGrid count={6} />}

        {!loading && error && (
          <StateMessage
            title="数据加载失败"
            desc={`读不到 data/works.json（${error}）。请先运行 npm run data 生成数据，或检查部署产物里是否包含该文件。`}
          />
        )}

        {!loading && !error && works.length === 0 && (
          <StateMessage
            title="还没有作品"
            desc="数据文件是空的。跑一次 npm run data，或在 data/mock-works.mjs 里打开几条 mock。"
          />
        )}

        {!loading && !error && works.length > 0 && shown.length === 0 && (
          <StateMessage
            title="没有匹配的作品"
            desc={`当前筛选：${lang === 'all' ? '全部语言' : lang}${query ? ` / 「${query}」` : ''}`}
          />
        )}

        {shown.length > 0 && (
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
            {shown.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[11px] text-faint">
          <span>
            共 {works.length} 件作品 · 显示 {shown.length} 件
          </span>
          <span>
            {generatedAt ? `数据生成于 ${new Date(generatedAt).toLocaleString('zh-CN')}` : '开发者模式'}
          </span>
        </footer>
      </main>
    </div>
  );
}
