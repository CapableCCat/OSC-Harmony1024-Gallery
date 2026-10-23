import { langMeta } from '../lib/languages';

/**
 * 语言分布条：一条 3px 的「数据脊线」。
 * 用最低的视觉成本提供仪表感——不用图例，数字在筛选 tab 里已有。
 */
export default function DistributionBar({ counts, total }) {
  if (!total) return null;

  const segments = Object.keys(counts)
    .filter((k) => k !== 'all' && counts[k] > 0)
    .map((k) => {
      const meta = langMeta(k);
      return {
        id: k,
        label: meta.label,
        count: counts[k],
        color: meta.color,
        pct: (counts[k] / total) * 100,
      };
    });

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-4 sm:px-8">
      <div className="flex h-[3px] w-full gap-px overflow-hidden rounded-full bg-line">
        {segments.map((s) => (
          <span
            key={s.id}
            title={`${s.label} ${s.count} 件`}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            className="block h-full opacity-70 transition-opacity hover:opacity-100"
          />
        ))}
      </div>
    </div>
  );
}
