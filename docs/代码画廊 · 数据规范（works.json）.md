# 代码画廊 · 数据规范（works.json）

> **状态**：🟢 活跃 · 数据契约唯一事实源。
> **定位**：定义作品数据的字段、生成规则与开关机制。**改字段先改本文，再改代码。**
> 需求背景见《需求基线 V1.0》（F-10 / F-11 / F-12），脚本用法见仓库根 `README.md`。

---

## 一、数据流向

```
data/mock-works.mjs ──────────┐
                              ├─► scripts/generate-data.js ─► client/public/data/works.json
AtomGit 作品仓库（CI 拉取）────┘        （--repo <dir>）            │
                                                              前端 fetch 读取
```

- 本地：`npm run data`（只有 mock）或 `node scripts/generate-data.js --repo "../1024"`
- CI：`node scripts/generate-data.js --repo ./works-repo`（mock 与否由 `SHOW_MOCK` 决定）
- 前端只认 `client/public/data/works.json`，构建后随 `dist` 一起发布

---

## 二、顶层结构

```json
{
  "generatedAt": "2026-10-23T09:49:20.470Z",
  "count": 8,
  "works": [ /* 作品对象，见下 */ ]
}
```

- `generatedAt`：产物生成时间。**数据无变化时保持原值**（避免每次构建弄脏工作树）。
- `count`：作品条数，前端据此渲染；`0` 表示空状态页（看板娘）。
- 前端兼容两种形状：`{works: [...]}` 与裸数组 `[...]`（防御旧产物）。

---

## 三、作品字段契约

| 字段 | 类型 | 必有 | 规则 |
| --- | --- | --- | --- |
| `id` | string | ✅ | 仓库作品：`r-` + 相对路径 sha1 前 8 位（路径不变则 id 稳定）；mock：`mock-*` |
| `author` | string | ✅ | 仓库作品 = 第一层目录名；根目录文件 = 仓库名；mock 手填 |
| `title` | string | ✗ | 优先读同目录 `README.md` 的一级标题（截断 60 字）；缺失时前端回落显示 `filename` |
| `filename` | string | ✅ | 文件名（含扩展名） |
| `language` | string | ✅ | 规范值五选一 + `other`，见「四、映射表」 |
| `runner` | string | ✅ | 执行器，由 language 推导（见下），数据里显式写出 |
| `code` | string | ✅ | 源码文本；**html 作品是内联后的单文件**，不是原始文件 |
| `output` | object \| null | ✗ | 仅 `cached` 有值：C/C++ 预执行结果，见「五」 |
| `tag` | string | ✅ | 奖项占位字段（D-06：无评奖，恒为空串，渲染分支保留） |
| `repo_url` | string | ✅ | AtomGit 仓库内对应目录链接；mock 亦填 |
| `mock` | boolean | ✅ | 是否示例数据；真实提取恒为 `false` |

前端过滤规则：`code` 字段不存在的条目直接丢弃（防脏数据进网格）。

---

## 四、language 与 runner 映射

| 规范 language | 认识的扩展名/别名 | runner | 前端行为 |
| --- | --- | --- | --- |
| `html` | `.html` `.htm` | `iframe` | 沙箱直渲 |
| `js` | `.js` `.mjs` | `iframe` | 包 HTML 壳后沙箱直渲（接管 console） |
| `python` | `.py` | `pyodide` | Worker 内真执行，5s 超时回收 |
| `c` | `.c` | `cached` | 回放预执行输出 |
| `cpp` | `.cpp` `.cc` `.cxx` | `cached` | 同上 |
| `other` | 以上之外 | `cached` | 仅展示源码（且通常没有 output） |

> 规范值写进数据的 `language` 字段；别名只出现在提取入口，**入库存规范值**。

---

## 五、output 对象（仅 cached）

```json
{
  "ok": true,
  "exitCode": 0,
  "timeout": false,
  "stdout": "Hello OpenHarmony\n",
  "stderr": ""
}
```

| 字段 | 说明 |
| --- | --- |
| `ok` | 编译且运行是否成功（编译失败 / 运行非零退出 / 超时均为 false） |
| `exitCode` | 进程退出码；编译失败或超时为 `null` |
| `timeout` | 运行超过 5s 被强制终止时为 `true`，`stderr` 固定为「运行超过 5 秒，已强制终止（疑似死循环）」 |
| `stdout` / `stderr` | **原样保存 ANSI 转义序列**，含 `\r\n` 一律归一为 `\n`；单条上限 20000 字符 |

前端用 `ansi-to-html`（`escapeXML: true`）渲染，同学输出的 `<` `>` 不会注入 DOM。

---

## 六、mock 机制

| 开关 | 位置 | 作用 |
| --- | --- | --- |
| `enabled` | `data/mock-works.mjs` 每条 | **逐条下线**单个示例卡 |
| `SHOW_MOCK` 环境变量 | 本地 shell | `false` 时整批跳过（本地全局开关） |
| `SHOW_MOCK` GitHub Variable | 仓库 Settings → Variables | **正式站开关**：改值后 Run workflow 即生效，不碰代码 |

- mock 条目必须带 `mock: true`（前端据此显示「示例」角标）。
- 活动开始后的下线流程：GitHub Variables 把 `SHOW_MOCK` 改 `false` → Run workflow。

---

## 七、提取脚本约定（generate-data.js）

### 扫描

- 递归全仓；跳过 `.git` `.github` `.idea` `.vscode` `node_modules` `__pycache__` `dist` `build`
- 只认上文扩展名；单文件源码上限 **256KB**（超限静默跳过）
- **去重**：被任一 HTML 以 `src/href/poster` 引用的文件不再单独成作品（css/js/图片已内联）

### HTML 内联

| 上限 | 值 | 超限行为 |
| --- | --- | --- |
| 单个资源 | 300KB | 不内联（保留原引用，沙箱里 404 也不崩） |
| 单作品内联总量 | 2MB | 同上 |
| 禁止目录穿越 | — | `../` 解析后超出 HTML 所在目录即拒绝 |

### C/C++ 预执行

| 项 | 值 |
| --- | --- |
| 编译 | `gcc` / `g++ -O0 -w`，以**源码目录**为 cwd（`#include "x.h"` 可解析），超时 20s |
| 运行 | 以**临时目录**为 cwd（同学程序不能写作品仓库），超时 5s `SIGKILL` |
| 缺编译器 | 不中断构建；该作品标记「未预执行」，`ok: false` |
| 输出 | stdout/stderr 全捕，含 ANSI；`\r\n → \n` 归一 |

### 稳定性

- `id` 由相对路径哈希生成：**作品不挪目录，id 永不变化**（前端 key、去重都依赖它）
- `generatedAt`：数据无变化则保留原时间，构建不弄脏工作树

---

## 八、常见问题

**Q：为什么 html 作品的 `code` 和仓库里的文件不一样？**
A：提取时做了单文件内联。srcdoc 只能注入一个文档，外链 css/js/图片在沙箱里会 404 导致白屏。

**Q：为什么 C/C++ 的「运行」不是实时的？**
A：浏览器没有 C 编译器（D-03）。作品是静态的，输出在构建期固化，运行 = 回放真实输出。

**Q：为什么空仓库时 CI 不报错？**
A：`ALLOW_EMPTY=true`（见 workflow）。活动开始前仓库为空属正常，部署空状态页；
提取逻辑稳定后可把该值改回 `false` 恢复熔断。

**Q：想加一个新字段？**
A：先改本文「三、字段契约」，再改 `generate-data.js` 的 `normalize()`，最后改前端。
字段只加不改名；废弃字段置空保留，避免旧产物解析失败。

---

*建立：2026-10-24 ｜ 依据：scripts/generate-data.js 当前实现 ｜ 改脚本先改本文*
