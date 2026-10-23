import { langMeta } from '../lib/languages';

/** 语言标签：方框 + 单色短码，是卡片上唯一的彩色文字 */
export default function LanguageBadge({ language }) {
  const meta = langMeta(language);

  return (
    <span
      className="mono shrink-0 rounded-[3px] border border-line px-1.5 py-[3px] text-[9px] leading-none tracking-[.14em]"
      style={{ color: meta.color }}
    >
      {meta.code || 'N/A'}
    </span>
  );
}
