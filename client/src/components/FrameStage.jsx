import { useMemo } from 'react';
import { useInView } from '../hooks/useInView';
import { buildSrcdoc } from '../lib/srcdoc';

/**
 * HTML / JS 作品的直渲区。
 * - 进入视口才挂 iframe（100+ 卡片同时挂会卡死浏览器）
 * - sandbox 仅 allow-scripts：拿不到父页面、拿不到 cookie/localStorage
 * - srcdoc 内注入 CSP：禁止 fetch/XHR/form，只放行内联资源与 https CDN
 */
export default function FrameStage({ code, language, title }) {
  const [ref, inView] = useInView({ rootMargin: '500px 0px' });
  const doc = useMemo(() => buildSrcdoc(code, language), [code, language]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden p-3">
      {inView ? (
        <iframe
          title={title}
          srcDoc={doc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full rounded-md bg-white"
        />
      ) : (
        <div className="grid h-full place-items-center bg-surface-2">
          <span className="text-[10.5px] text-faint">滚动到此处后渲染</span>
        </div>
      )}
    </div>
  );
}
