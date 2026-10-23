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
