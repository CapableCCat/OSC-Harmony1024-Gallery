/**
 * 语言元信息：颜色走 CSS 变量（浅色/深色各一套，见 index.css）。
 * 只认 5 个规范值（html / js / python / c / cpp）+ other 兜底。
 */
export const LANGUAGES = {
  html: {
    id: 'html',
    label: 'HTML',
    color: 'var(--lang-html)',
    hljs: 'xml',
    runner: 'iframe',
    hint: '实时渲染',
  },
  js: {
    id: 'js',
    label: 'JavaScript',
    color: 'var(--lang-js)',
    hljs: 'javascript',
    runner: 'iframe',
    hint: '实时渲染',
  },
  python: {
    id: 'python',
    label: 'Python',
    color: 'var(--lang-python)',
    hljs: 'python',
    runner: 'pyodide',
    hint: '浏览器内执行',
  },
  c: {
    id: 'c',
    label: 'C',
    color: 'var(--lang-c)',
    hljs: 'c',
    runner: 'cached',
    hint: '预执行回放',
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    color: 'var(--lang-cpp)',
    hljs: 'cpp',
    runner: 'cached',
    hint: '预执行回放',
  },
  other: {
    id: 'other',
    label: '其他',
    color: 'var(--app-faint)',
    hljs: 'plaintext',
    runner: 'cached',
    hint: '仅展示源码',
  },
};

export const LANG_ORDER = ['html', 'js', 'python', 'c', 'cpp', 'other'];

export function langMeta(id) {
  return LANGUAGES[id] || LANGUAGES.other;
}
