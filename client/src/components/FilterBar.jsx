import { langMeta } from '../lib/languages';

export default function FilterBar({ active, onChange, query, onQueryChange, counts }) {
  const tabs = [
    { id: 'all', label: '全部', count: counts.all || 0 },
    ...Object.keys(counts)
      .filter((k) => k !== 'all' && counts[k] > 0)
      .map((k) => ({ id: k, label: langMeta(k).label, count: counts[k] })),
  ];

  return (
    <div className="mx-auto flex max-w-[1280px] flex-wrap items-end gap-x-4 gap-y-3 px-5 pt-7 sm:px-8">
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative pb-1.5 text-[13px] transition-colors ${
                isActive ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-[11px] tabular-nums text-faint">{tab.count}</span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-ink" />
              )}
            </button>
          );
        })}
      </nav>

      <label className="relative ml-auto flex w-full items-center sm:w-56">
        <svg
          className="pointer-events-none absolute left-2.5 text-faint"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜索作者、文件名或奖项"
          className="h-8 w-full rounded-md border border-line bg-surface pl-8 pr-7 text-[12px] text-ink placeholder:text-faint transition-colors focus:border-line-hover focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-2 text-[11px] text-faint hover:text-ink"
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </label>
    </div>
  );
}
