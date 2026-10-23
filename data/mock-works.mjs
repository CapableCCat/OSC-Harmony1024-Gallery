/**
 * Mock 作品数据（开发期夹具）
 * ------------------------------------------------------------
 * 作用：活动初期真实提交很少，先用这批假数据把页面填满。
 * 开关：
 *   1. 单条 —— 把某条的 `enabled` 改成 false，即下线这一条；
 *   2. 全局 —— 环境变量 SHOW_MOCK=false 时，整批 mock 不进入产物。
 *
 * 字段与真实提取产物完全一致（见 docs/代码画廊 · 数据规范.md），
 * 所以关掉 mock 不会影响前端任何逻辑。
 */

export default [
  {
    id: 'mock-html-01',
    author: '李四',
    title: '霓虹灯牌',
    filename: 'index.html',
    language: 'html',
    runner: 'iframe',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/lisi',
    code: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body{margin:0;height:100vh;display:grid;place-items:center;background:#08080f;font-family:ui-monospace,monospace}
  h1{
    margin:0;font-size:26px;letter-spacing:.12em;
    color:#4ade80;
    text-shadow:0 0 8px #22c55e,0 0 24px #16a34a,0 0 40px #15803d;
    animation:flicker 3.4s infinite;
  }
  span{display:block;margin-top:10px;font-size:11px;color:#22d3ee;letter-spacing:.3em;text-align:center}
  @keyframes flicker{
    0%,18%,22%,25%,53%,57%,100%{opacity:1}
    20%,24%,55%{opacity:.35}
  }
</style>
</head>
<body>
  <div>
    <h1>Hello OpenHarmony</h1>
    <span>1024 PROGRAMMER'S DAY</span>
  </div>
</body>
</html>`,
  },
  {
    id: 'mock-html-02',
    author: '王五',
    title: '一行红字',
    filename: 'index.html',
    language: 'html',
    runner: 'iframe',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/wangwu',
    code: `<div style='color:red; font-size:24px;'>Hello OpenHarmony</div>`,
  },
  {
    id: 'mock-html-03',
    author: '陈曦',
    title: '终端打字机',
    filename: 'index.html',
    language: 'html',
    runner: 'iframe',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/chenxi',
    code: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body{margin:0;background:#0b0b12;height:100vh;display:grid;place-items:center;
       font:13px/1.9 ui-monospace,Consolas,monospace}
  .win{width:88%;max-width:360px;border:1px solid #2b2b3d;border-radius:8px;overflow:hidden;background:#101018}
  .bar{display:flex;gap:5px;padding:7px 9px;background:#16161f;border-bottom:1px solid #242433}
  .dot{width:8px;height:8px;border-radius:50%}
  .body{padding:12px;color:#9ca3af;white-space:pre-wrap}
  .g{color:#4ade80}.c{color:#22d3ee}
  .caret{display:inline-block;width:7px;height:13px;background:#4ade80;vertical-align:-2px;
         animation:blink .9s steps(1) infinite}
  @keyframes blink{50%{opacity:0}}
</style>
</head>
<body>
  <div class="win">
    <div class="bar">
      <i class="dot" style="background:#f87171"></i>
      <i class="dot" style="background:#fbbf24"></i>
      <i class="dot" style="background:#34d399"></i>
    </div>
    <div class="body"><span class="c">~/1024 $</span> <span class="g">echo</span> "Hello OpenHarmony"
Hello OpenHarmony
<span class="c">~/1024 $</span> <span class="caret"></span></div>
  </div>
</body>
</html>`,
  },
  {
    id: 'mock-js-01',
    author: '赵一鸣',
    title: '控制台树',
    filename: 'tree.js',
    language: 'js',
    runner: 'iframe',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/zhaoyiming',
    code: `console.log('Hello OpenHarmony');
console.log('---');

const os = { name: 'OpenHarmony', version: '5.0', kernel: 'LiteOS-M' };
for (const [k, v] of Object.entries(os)) {
  console.log(k.padEnd(10), v);
}

console.log('---');
[1, 2, 3].forEach((n) => console.log('第 ' + n + ' 次问候'));
console.warn('注意：这只是沙箱里的输出');`,
  },
  {
    id: 'mock-py-01',
    author: '张三',
    title: '紫色问候',
    filename: 'hello.py',
    language: 'python',
    runner: 'pyodide',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/zhangsan',
    code: `print('\\033[95mHello OpenHarmony!\\033[0m')`,
  },
  {
    id: 'mock-py-02',
    author: '孙悦',
    title: 'ASCII 横幅',
    filename: 'banner.py',
    language: 'python',
    runner: 'pyodide',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/sunyue',
    code: `text = "HELLO OPENHARMONY"
rows = ["#" * (len(text) + 4)]
rows.append("# " + text + " #")
rows.append("#" * (len(text) + 4))
print("\\n".join(rows))
print()
print("  " + " ".join(text))
print("  " + " ".join("-" * len(text)))`,
  },
  {
    id: 'mock-py-03',
    author: '周雨桐',
    title: '心跳动画',
    filename: 'beat.py',
    language: 'python',
    runner: 'pyodide',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/zhouyutong',
    code: `import time

frames = ["♡", "❤"]
for i in range(6):
    print(f"\\r{'Hello OpenHarmony ' + frames[i % 2]:<30}", end="", flush=True)
    time.sleep(0.05)

print("\\n")
for ch in "OpenHarmony":
    print(f"\\033[96m{ch}\\033[0m", end=" ")
print()`,
  },
  {
    id: 'mock-py-04',
    author: '刘思远',
    title: '故意报错',
    filename: 'bad.py',
    language: 'python',
    runner: 'pyodide',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/liusiyuan',
    code: `print("Hello OpenHarmony")
# 下面这行是故意写错的，用来测试错误态展示
print(1 / 0)`,
  },
  {
    id: 'mock-c-01',
    author: '吴迪',
    title: '标准问候',
    filename: 'hello.c',
    language: 'c',
    runner: 'cached',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/wudi',
    code: `#include <stdio.h>

int main(void) {
    printf("Hello OpenHarmony\\n");
    return 0;
}`,
    output: {
      ok: true,
      exitCode: 0,
      timeout: false,
      stdout: 'Hello OpenHarmony\n',
      stderr: '',
    },
  },
  {
    id: 'mock-c-02',
    author: '郑凯',
    title: '带颜色的方框',
    filename: 'box.c',
    language: 'c',
    runner: 'cached',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/zhengkai',
    code: `#include <stdio.h>

int main(void) {
    const char *msg = "Hello OpenHarmony";
    printf("\\033[92m+---------------------+\\033[0m\\n");
    printf("\\033[92m|\\033[0m %-19s \\033[92m|\\033[0m\\n", msg);
    printf("\\033[92m+---------------------+\\033[0m\\n");
    return 0;
}`,
    output: {
      ok: true,
      exitCode: 0,
      timeout: false,
      stdout:
        '\u001b[92m+---------------------+\u001b[0m\n\u001b[92m|\u001b[0m Hello OpenHarmony   \u001b[92m|\u001b[0m\n\u001b[92m+---------------------+\u001b[0m\n',
      stderr: '',
    },
  },
  {
    id: 'mock-cpp-01',
    author: '何嘉树',
    title: 'C++ 问候',
    filename: 'hello.cpp',
    language: 'cpp',
    runner: 'cached',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/hejiashu',
    code: `#include <iostream>
#include <string>

int main() {
    const std::string target = "OpenHarmony";
    std::cout << "Hello " << target << "!" << std::endl;

    for (int i = 1; i <= 3; ++i) {
        std::cout << i << " -> Hello " << target << std::endl;
    }
    return 0;
}`,
    output: {
      ok: true,
      exitCode: 0,
      timeout: false,
      stdout:
        'Hello OpenHarmony!\n1 -> Hello OpenHarmony\n2 -> Hello OpenHarmony\n3 -> Hello OpenHarmony\n',
      stderr: '',
    },
  },
  {
    id: 'mock-cpp-02',
    author: '冯乐',
    title: '编译失败示例',
    filename: 'broken.cpp',
    language: 'cpp',
    runner: 'cached',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/fengle',
    code: `#include <iostream>

int main() {
    std::cout << "Hello OpenHarmony" << std::endl
    return 0;
}`,
    output: {
      ok: false,
      exitCode: 1,
      timeout: false,
      stdout: '',
      stderr:
        "broken.cpp: In function 'int main()':\nbroken.cpp:5:5: error: expected ';' before 'return'\n    5 |     return 0;\n      |     ^~~~~~\n",
    },
  },
  {
    id: 'mock-html-04',
    author: '许清和',
    title: 'CDN 样式试验',
    filename: 'index.html',
    language: 'html',
    runner: 'iframe',
    tag: '',
    enabled: true,
    repo_url: 'https://atomgit.com/tsgu-osc-org/1024/tree/main/xuqinghe',
    code: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body{margin:0;display:grid;place-items:center;height:100vh;background:#0f172a;
       font-family:system-ui,sans-serif;color:#e2e8f0}
  .card{padding:22px 28px;border-radius:14px;text-align:center;
        background:linear-gradient(135deg,#1e293b,#0f172a);
        border:1px solid #334155;box-shadow:0 0 40px rgba(56,189,248,.18)}
  b{display:block;font-size:19px;color:#38bdf8;letter-spacing:.05em}
  small{color:#94a3b8;font-size:11px}
</style>
</head>
<body>
  <div class="card">
    <b>Hello OpenHarmony</b>
    <small>© 2026 天津中德开源鸿蒙社</small>
  </div>
</body>
</html>`,
  },
  {
    id: 'mock-py-05',
    author: '压力测试',
    title: '死循环（默认关闭）',
    filename: 'loop.py',
    language: 'python',
    runner: 'pyodide',
    tag: '',
    enabled: false, // ← 需要复测 5s 强制终止时改成 true（已在 2026-10-23 实测通过）
    repo_url: '',
    code: `print("开始死循环，5 秒后应被强制终止")
while True:
    pass`,
  },
];
