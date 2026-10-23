import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import plaintext from 'highlight.js/lib/languages/plaintext';

import { langMeta } from '../lib/languages';
import { useInView } from '../hooks/useInView';

hljs.registerLanguage('xml', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('plaintext', plaintext);

const MAX_HIGHLIGHT_CHARS = 20000;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function CodePane({ code, language, className = '' }) {
  const meta = langMeta(language);
  const [ref, inView] = useInView({ rootMargin: '300px 0px' });

  const html = useMemo(() => {
    if (!inView) return '';
    const src = String(code || '').slice(0, MAX_HIGHLIGHT_CHARS);
    try {
      return hljs.highlight(src, { language: meta.hljs, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(src);
    }
  }, [inView, code, meta.hljs]);

  return (
    <pre
      ref={ref}
      className={`h-full overflow-auto px-4 py-3.5 mono text-[12px] leading-[1.75] text-ink ${className}`}
    >
      {html ? (
        <code dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <code className="text-faint">…</code>
      )}
    </pre>
  );
}
