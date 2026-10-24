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

          {/* 仓库入口：展示站（GitHub）/ 作品仓库（AtomGit） */}
          <nav className="flex items-center gap-2.5" aria-label="代码仓库">
            <a
              href="https://github.com/CapableCCat/OSC-Harmony1024-Gallery"
              target="_blank"
              rel="noreferrer noopener"
              title="GitHub · 展示站仓库"
              aria-label="GitHub 展示站仓库"
              className="text-faint transition-colors hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
            <a
              href="https://atomgit.com/tsgu-osc-org/1024"
              target="_blank"
              rel="noreferrer noopener"
              title="AtomGit · 作品仓库"
              aria-label="AtomGit 作品仓库"
              className="text-faint transition-colors hover:text-ink"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
                <ellipse cx="12" cy="12" rx="9" ry="3.8" />
                <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
