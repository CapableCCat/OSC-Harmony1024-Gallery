import { useMemo } from 'react';
import { useInView } from '../hooks/useInView';
import { buildSrcdoc } from '../lib/srcdoc';

/**
 * HTML / JS 作品的直渲区。
 *
 * 关键设计：不改同学的代码，而是给每张预览套一层极薄的「纸面」衬边。
 * 白底作品自然融进纸面，深色作品得到一条清楚的边界，避免明暗在
 * 纯白与纯黑之间反复横跳。
 *
 * 安全：sandbox 仅 allow-scripts + srcdoc 注入 CSP（禁 fetch/XHR/form）。
 */
export default function FrameStage({ code, language, title }) {
  const [ref, inView] = useInView({ rootMargin: '250px 0px' });
  const doc = useMemo(() => (inView ? buildSrcdoc(code, language) : ''), [inView, code, language]);

  return (
    <div ref={ref} className="h-full w-full overflow-hidden bg-paper p-2.5">
      {inView ? (
        <iframe
          title={title}
          srcDoc={doc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full rounded-[3px] border-0"
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <span className="text-[10.5px] text-[#9a9791]">滚动到此处后渲染</span>
        </div>
      )}
    </div>
  );
}
