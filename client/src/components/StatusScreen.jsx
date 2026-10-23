export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[384px] animate-pulse rounded-xl border border-line bg-surface"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function StateMessage({ title, desc }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
      <div className="mono mx-auto mb-4 flex size-10 items-center justify-center rounded-lg border border-line text-[12px] text-faint">
        {'</>'}
      </div>
      <h2 className="text-[13px] font-medium text-ink">{title}</h2>
      {desc && (
        <p className="mx-auto mt-2 max-w-md text-[11.5px] leading-5 text-muted">{desc}</p>
      )}
    </div>
  );
}

/**
 * 作品仓库还没有合并任何提交时的空状态。
 * 插图裁掉底部 30%（那里是 AI 生成的水印），并用径向遮罩把边缘融进页面底色。
 */
export function EmptyGallery() {
  return (
    <div className="relative z-0 flex flex-col items-center pb-10 pt-2 text-center">
      <div
        className="w-64 max-w-full overflow-hidden"
        style={{ aspectRatio: '1024 / 715' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}mascot.png`}
          alt="1024 代码画廊看板娘"
          className="h-full w-full object-cover object-top"
          style={{
            mixBlendMode: 'lighten',
            WebkitMaskImage:
              'radial-gradient(72% 72% at 50% 40%, #000 58%, transparent 98%)',
            maskImage:
              'radial-gradient(72% 72% at 50% 40%, #000 58%, transparent 98%)',
          }}
        />
      </div>

      <h2 className="-mt-1 text-[15px] font-medium text-ink">作品正在路上</h2>
      <p className="mt-2 max-w-md text-[12px] leading-5 text-muted">
        同学们的作品正在审核与合并中，合并完成后本页会自动更新。
      </p>
      <a
        href="https://atomgit.com/tsgu-osc-org/1024"
        target="_blank"
        rel="noreferrer noopener"
        className="mono mt-3 text-[11px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        去作品仓库围观 →
      </a>
      <p className="mono mt-6 text-[10px] tracking-[.18em] text-faint">
        WAITING FOR FIRST MERGE · 1024
      </p>
    </div>
  );
}
