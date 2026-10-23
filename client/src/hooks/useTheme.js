import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gallery-theme';

function readTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** 主题：默认白天，选择记在 localStorage（首帧由 index.html 内联脚本先行应用） */
export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* 隐私模式忽略 */
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#141519' : '#f7f6f3');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggle];
}
