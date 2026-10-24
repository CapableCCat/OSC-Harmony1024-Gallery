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
              className="flex size-5 items-center justify-center text-faint transition-colors hover:text-ink"
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
              className="flex size-5 items-center justify-center text-faint transition-colors hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  fill="currentColor"
                  d="M15.3313 5.42582C15.4624 5.3521 15.601 5.27416 15.7506 5.18878C15.7686 5.28723 15.7862 5.37319 15.8021 5.4511C15.8303 5.58856 15.8534 5.70163 15.8646 5.81335C15.9532 6.78359 16.4385 7.49732 17.1263 7.65804C18.1321 7.89273 19.0805 7.50482 19.5914 6.64896C20.2052 5.62204 19.9387 4.36435 18.8936 3.60733C15.9878 1.50123 12.7954 0.920349 9.35651 1.93472C1.94166 4.13324 -0.595438 13.2871 4.66705 18.9006C6.9185 21.3018 9.77729 22.3378 13.0223 22.2594C17.1794 22.1613 20.1733 20.0795 22.0845 16.4712C23.4395 13.9111 21.9665 11.1128 19.1455 10.5312C17.5344 10.2052 15.8868 10.0994 14.2475 10.2167C13.702 10.2693 13.1726 10.4312 12.6904 10.6927C12.1508 10.9741 11.9948 11.5581 12.0554 12.1368C12.1117 12.6641 12.5141 12.9803 12.9932 13.0599C13.958 13.2116 14.9343 13.2998 15.9087 13.3802C16.1907 13.4041 16.4753 13.4069 16.7595 13.4098C17.1674 13.4139 17.5744 13.418 17.9721 13.484C19.1065 13.6724 19.496 14.5975 18.9125 15.5872C18.7696 15.8251 18.603 16.0478 18.4151 16.2519C17.652 17.0953 16.654 17.6886 15.5509 17.9546C13.5373 18.45 11.5217 18.4778 9.51746 17.8416C7.23521 17.118 5.8746 15.4334 5.8268 13.1656C5.80892 11.767 6.16224 10.389 6.8504 9.1732C7.16131 8.6065 7.33196 8.02286 7.284 7.3807C7.2638 7.10693 7.25262 6.83285 7.2406 6.53832C7.23421 6.38157 7.22758 6.21903 7.21922 6.04765C7.45038 6.09641 7.67867 6.15795 7.90307 6.23203C8.776 6.58417 9.63519 6.74482 10.5801 6.48635C11.1176 6.35719 11.6731 6.32145 12.2225 6.38069C13.1073 6.45318 13.9917 6.23594 14.7435 5.76141C14.9311 5.65089 15.1219 5.54359 15.3313 5.42582Z"
                />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
