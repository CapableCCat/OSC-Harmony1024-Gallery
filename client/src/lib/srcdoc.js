/**
 * 把作品的源码包装成可安全放进 iframe.srcdoc 的文档。
 *
 * 安全策略（两层）：
 *   1. sandbox="allow-scripts"（无 allow-same-origin）→ 作品拿不到父页面、拿不到 localStorage。
 *   2. 注入 CSP meta → 即使拿到脚本执行权，也无法往外发请求（connect-src 'none'）、
 *      无法提交表单、无法再嵌 iframe。
 *
 * 放行的资源：内联脚本/样式、CDN 上的脚本/样式/字体/图片（很多同学会用 CDN）。
 */

const CSP = [
  "default-src 'none'",
  "img-src data: blob: https:",
  "media-src data: blob: https:",
  "style-src 'unsafe-inline' https:",
  "font-src data: https:",
  "script-src 'unsafe-inline' 'unsafe-eval' https:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ');

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
const CHARSET_META = '<meta charset="utf-8">';

/** 确保文档里有 head，并把 CSP 塞到最前面（CSP meta 必须在任何资源之前） */
function injectIntoHead(html) {
  const metas = `${CHARSET_META}${CSP_META}`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${metas}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${metas}</head>`);
  }
  return `<!doctype html><html><head>${metas}</head><body>${html}</body></html>`;
}

/**
 * 独立 .js 文件没有 HTML 外壳，包一层：黑底白字 + 捕获 console 到页面上。
 */
function wrapJs(code) {
  // 防止同学代码里的 </script> 提前闭合我们的外壳
  const safe = String(code).replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html,body{margin:0;background:#fff;color:#111827}
  #__out{margin:0;padding:10px 12px;font:12.5px/1.75 ui-monospace,Consolas,monospace;
         white-space:pre-wrap;word-break:break-word}
</style>
</head>
<body>
<pre id="__out"></pre>
<script>
(function () {
  var out = document.getElementById('__out');
  function fmt(v) {
    if (typeof v === 'string') return v;
    try { return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v); }
    catch (e) { return String(v); }
  }
  function log() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i]));
    out.textContent += parts.join(' ') + '\\n';
  }
  console.log = console.info = console.debug = console.warn = log;
  console.error = function () {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i]));
    out.textContent += parts.join(' ') + '\\n';
  };
  window.onerror = function (msg) { out.textContent += '[Error] ' + msg + '\\n'; };
  window.addEventListener('unhandledrejection', function (e) {
    out.textContent += '[Unhandled] ' + fmt(e.reason) + '\\n';
  });
})();
</script>
<script>
${safe}
</script>
</body>
</html>`;
}

export function buildSrcdoc(code, language) {
  const src = String(code || '');
  if (!src.trim()) {
    return `<!doctype html><html><head>${CHARSET_META}${CSP_META}<style>
      body{margin:0;height:100vh;display:grid;place-items:center;background:#0b0b12;
           color:#475569;font:12px ui-monospace,monospace}
    </style></head><body>这个作品没有可渲染的代码</body></html>`;
  }
  return injectIntoHead(language === 'js' ? wrapJs(src) : src);
}
