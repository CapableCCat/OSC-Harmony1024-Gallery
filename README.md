# OSC-Harmony1024-Gallery

天津中德开源鸿蒙社 · 1024 程序员节**代码画廊**。

同学们提交各种语言的「Hello OpenHarmony」作品，这里把代码**真的跑起来**给人看：HTML/JS 直接在沙箱 iframe 里渲染，Python 在浏览器里用 Pyodide 执行，C/C++ 在构建阶段编译好、点运行回放真实输出。

**零后端**：没有服务器、没有数据库、没有跨域。整站是纯静态产物，部署到 Cloudflare Pages 即可。

> 📚 **项目文档**：需求基线、数据规范、交接提示词都在 [`docs/README.md`](./docs/README.md)（文档索引）。

---

## 一、三种执行方式

| 语言 | 执行器 | 做法 | 为什么 |
| --- | --- | --- | --- |
| HTML / JS | `iframe` | `sandbox="allow-scripts"` + srcdoc 注入 CSP | 零延迟、不需要执行后端；沙箱拿不到父页面与 cookie |
| Python | `pyodide` | 浏览器里的 CPython（WASM），跑在 **Web Worker** | 真执行，且死循环可以被 `terminate()` 强制回收；输出边跑边送到页面，终端逐帧动画能真的动起来 |
| C / C++ | `cached` | 构建阶段用 gcc/g++ 编译执行，输出存进 JSON | 浏览器没有 C 编译器；作品是静态的，输出可预先生成 |

> 早期方案是「Node 代理 + Piston 容器」，因 Render 免费版无法运行 `--privileged` / cgroup v2 的 Piston 而放弃，改为零后端。

---

## 二、目录结构

```
OSC-Harmony1024-Gallery/
├─ .github/workflows/deploy.yml   # CI：拉作品仓库 → 提取 → 构建 → 部署
├─ data/mock-works.mjs            # 开发期假数据（逐条 enabled 开关）
├─ scripts/
│  ├─ generate-data.js            # 作品提取（HTML 内联 / C-C++ 预执行）
│  ├─ vendor-pyodide.mjs          # 自托管 Python 运行时（11.7MB）
│  └─ vendor-fonts.mjs            # 自托管 IBM Plex（98KB）
├─ client/
│  ├─ public/pyodide/             # Python 运行时（构建期补齐）
│  ├─ public/data/works.json      # 数据产物（脚本生成）
│  └─ src/
│     ├─ components/              # 卡片、预览、代码/输出面板…
│     ├─ hooks/                   # useWorks / useRunner / useInView
│     └─ lib/runners/python.js    # Pyodide 单例 Worker + 超时回收
└─ docs/                          # 需求与背景文档
```

---

## 三、本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run dev` 会先生成数据（默认只有 mock），再起 Vite。

**关掉假数据**：把 `data/mock-works.mjs` 里某条的 `enabled` 改成 `false`（逐条下线），
或 `SHOW_MOCK=false npm run data`（整批下线）。

### 用真实作品数据（双仓库本地测试）

作品仓库与展示仓库是两个独立仓库。本地把两者放在同级目录：

```
<某个目录>/
├─ OSC-Harmony1024-Gallery/     ← 本项目
└─ 1024/                        ← 作品仓库（git clone https://atomgit.com/tsgu-osc-org/1024.git）
```

然后在本项目根目录：

```bash
# 路径含空格时必须加引号
node scripts/generate-data.js --repo "../1024"

# 或
npm run data:repo -- "../1024"

# 连 mock 一起关掉
node scripts/generate-data.js --repo "../1024" --no-mock
```

脚本会打印语言分布与执行器分布，产物写到 `client/public/data/works.json`，刷新页面即可看到。

| 参数 | 说明 |
| --- | --- |
| `--repo <dir>` | 作品仓库路径 |
| `--out <file>` | 自定义输出文件 |
| `--repo-url <base>` | 作品仓库链接前缀（默认 AtomGit 主干） |
| `--concurrency <n>` | C/C++ 编译并发数（默认 4） |
| `--no-mock` | 不合并 mock 数据 |

**本地编译 C/C++** 需要 `gcc` / `g++` 在 PATH 里（Windows 装 MinGW-w64 或走 WSL）。缺失时不会中断构建，只把该作品标记为「未预执行」。

---

## 四、提取脚本做了什么

1. **递归扫描**作品仓库，跳过 `.git` / `node_modules` / `.github` 等目录。
2. **作者** = 作品所在的第一层目录名；**标题**优先读同目录 `README.md` 的一级标题。
3. **HTML 单文件内联**：把同目录的 `<link href>`、`<script src>`、`<img src>` 以及 CSS 里的 `url()` 全部内联（图片转 base64）。srcdoc 只能注入一个文档，外链资源在沙箱里会 404 导致白屏。
4. **去重**：被 HTML 引用的 js/css/图片不再单独算一个作品。
5. **C/C++ 预执行**：以源码目录为工作目录编译（`#include "xxx.h"` 才能解析），编译超时 20s、运行超时 5s，超时直接 `SIGKILL` 并在输出里标记「运行超过 5 秒，已强制终止」。程序以临时目录为工作目录运行，避免往作品仓库里写文件。
6. 输出规范化：语言只认 `html` / `js` / `python` / `c` / `cpp`，执行器由语言推导。

---

## 五、部署（GitHub Actions → Cloudflare Pages）

### 1. 前置：创建 Cloudflare Pages 项目

Cloudflare Dashboard → **Workers & Pages** → Create → **Pages** → **Upload assets**，
项目名建议 `osc-harmony1024-gallery`（要与仓库变量一致；首次部署时 wrangler 也能自动创建）。

同时记下右侧边栏的 **Account ID**。

### 2. 创建 API Token

Dashboard 右上角头像 → **My Profile** → **API Tokens** → **Create Token** → **Custom token**：

- Permissions：`Account` · **Cloudflare Pages** · **Edit**
- Account Resources：包含你的账号

> 若部署时报权限不足，再补一条 `Account` · `Account Settings` · `Read`。

### 3. 配置 GitHub Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions**：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 上一步生成的 Token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | 账户 ID |
| Variable（可选） | `CLOUDFLARE_PAGES_PROJECT` | Pages 项目名，不填则用 `osc-harmony1024-gallery` |

### 4. 流水线做什么

`.github/workflows/deploy.yml`：

1. 检出**展示仓库**
2. `git clone --depth 1` 拉取**作品仓库**到 `works-repo/`
   （作品仓库在 AtomGit，不是 GitHub，所以不能用 `actions/checkout` 的 `repository` 参数）
3. `npm ci`
4. `node scripts/generate-data.js --repo ./works-repo --no-mock`
   （`ubuntu-latest` 自带 gcc/g++，C/C++ 在这一步编译）
5. 校验作品数 > 0，否则终止部署，避免把空页面发出去
6. `npm run build:site`（只做 vendor + vite build，**不重复生成数据**）
7. `wrangler pages deploy client/dist` 发布

> ⚠️ 产物目录是 **`client/dist`**（monorepo 结构），不是根目录的 `dist`。

### 5. 手动重新部署

活动截止后数据有变动：仓库 **Actions** → **Build & Deploy** → **Run workflow**。
也可以直接 push 一次空提交触发。

---

## 六、安全边界

- **iframe**：只给 `sandbox="allow-scripts"`，没有 `allow-same-origin`，作品拿不到父页面、localStorage、cookie。
- **CSP**：srcdoc 内注入 `connect-src 'none'`、`form-action 'none'`、`frame-src 'none'`，作品无法往外部发请求；只放行内联资源与 https CDN。
- **Python**：Pyodide 运行在独立 Worker，5 秒超时直接销毁 Worker，死循环不会锁死页面。
- **C/C++ 预执行在构建机上进行**，不在访客浏览器里跑；若在本地跑陌生代码，建议在有快照的机器/容器里执行。

---

## 七、已知限制

- C/C++ 的「运行」是**回放构建时的输出**，不是浏览器实时编译；作品代码改动后需要重新构建。
- Python 首次运行需加载约 12MB 运行时（已自托管，浏览器缓存后秒开）。
- 校园网访问 `*.pages.dev` 可能有波动，正式对外建议绑定自定义域名。
