export default function Header({ total, languageCount }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-5 sm:px-8">
        <span className="mono flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-[11px] text-ink">
          {'</>'}<span className="caret ml-1 inline-block h-[9px] w-[5px] bg-accent align-baseline" />
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-semibold leading-tight">1024 代码画廊</h1>
          <p className="truncate text-[11.5px] leading-tight text-faint">
            天津中德开源鸿蒙社 · 程序员节作品展
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-4 mono text-[10.5px] tracking-[.14em] text-faint sm:flex">
            <span className="flex items-center gap-1.5">
              <i className="size-1 rounded-full bg-accent" />
              SYS ONLINE
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="tabular-nums">
              {String(total).padStart(3, '0')} WORKS
            </span>
            <span className="tabular-nums">{String(languageCount).padStart(2, '0')} LANGS</span>
          </div>
        </div>
      </div>
    </header>
  );
}
