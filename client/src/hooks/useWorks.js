import { useEffect, useState } from 'react';

/**
 * 读取数据。零后端方案：直接取构建产物里的静态 JSON。
 * 兼容两种形状：
 *   { generatedAt, count, works: [...] }   ← generate-data.js 产出
 *   [ ... ]                                ← 手写数组
 */
export function useWorks() {
  const [state, setState] = useState({ works: [], generatedAt: '', loading: true, error: '' });

  useEffect(() => {
    let alive = true;
    const url = `${import.meta.env.BASE_URL}data/works.json`;

    fetch(url, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        const works = Array.isArray(data) ? data : data.works || [];
        setState({
          works: works.filter((w) => w && w.code !== undefined),
          generatedAt: Array.isArray(data) ? '' : data.generatedAt || '',
          loading: false,
          error: '',
        });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ works: [], generatedAt: '', loading: false, error: String(err.message || err) });
      });

    return () => {
      alive = false;
    };
  }, []);

  return state;
}
