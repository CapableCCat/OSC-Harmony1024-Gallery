import { langMeta } from '../lib/languages';

export default function LanguageBadge({ language }) {
  const meta = langMeta(language);

  return (
    <span
      className="mono shrink-0 text-[10.5px] leading-none tracking-wide"
      style={{ color: meta.color }}
    >
      {meta.label}
    </span>
  );
}
