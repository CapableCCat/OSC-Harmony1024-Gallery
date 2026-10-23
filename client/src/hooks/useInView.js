import { useEffect, useRef, useState } from 'react';

/**
 * 元素进入视口才返回 true —— 用于 iframe 懒渲染与代码高亮按需执行。
 * 100+ 卡片同时挂 iframe 会把浏览器打爆，所以这个是首版必需项。
 */
export function useInView({ rootMargin = '400px 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || (once && inView)) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin }
    );

    io.observe(el);

    /**
     * 兜底：标签页在后台时 IntersectionObserver 不会回调（浏览器节流），
     * 用户切回来可能仍看到"进入视口后渲染"的占位。这里用几何位置兜底，
     * 但只在元素确实靠近视口时才渲染，避免把 100 张卡片的 iframe 全挂上。
     */
    const fallback = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (rect.width > 0 && rect.top < vh + 200 && rect.bottom > -200) {
        setInView(true);
        io.disconnect();
      }
    }, 1200);

    return () => {
      clearTimeout(fallback);
      io.disconnect();
    };
  }, [rootMargin, once, inView]);

  return [ref, inView];
}
