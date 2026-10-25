/**
 * Cloudflare Worker：作品同步触发器
 * ------------------------------------------------------------
 * 为什么需要它：
 *   GitHub Actions 的 schedule（cron）是 best-effort，实测在低活跃仓库上会被
 *   延迟到 2~5 小时才跑一次，同学合并作品后迟迟不上墙。
 *   这个 Worker 用 Cloudflare 自己的 Cron Trigger（准点，免费额度足够）去调
 *   GitHub 的 workflow_dispatch 接口，把同步周期压到几分钟。
 *
 * 需要的环境变量（在 Cloudflare 后台配置，GH_TOKEN 必须是 Secret）：
 *   GH_TOKEN     细粒度 PAT，权限只要 Actions: Read and write
 *   GH_REPO      形如 CapableCCat/OSC-Harmony1024-Gallery
 *   GH_WORKFLOW  工作流文件名，如 deploy.yml
 *   GH_REF       分支，默认 main
 *   MANUAL_KEY   可选。设置后可用 /?key=xxx 手动触发，方便自测
 *
 * 部署步骤见 docs/代码画廊 · 定时同步配置（一次性）.md
 */

const API = 'https://api.github.com';

async function dispatch(env) {
  const repo = env.GH_REPO;
  const workflow = env.GH_WORKFLOW || 'deploy.yml';
  const ref = env.GH_REF || 'main';

  if (!env.GH_TOKEN || !repo) {
    throw new Error('缺少 GH_TOKEN / GH_REPO 环境变量');
  }

  const res = await fetch(`${API}/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'osc-gallery-sync',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref }),
  });

  // 成功是 204，没有响应体
  if (res.status !== 204) {
    const text = await res.text();
    throw new Error(`dispatch 失败 ${res.status}: ${text.slice(0, 300)}`);
  }
  return { ok: true, repo, workflow, ref };
}

export default {
  // Cloudflare Cron Trigger 每次触发走这里
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      dispatch(env).catch((err) => {
        // 让失败在 Workers 日志里可见：wrangler tail 或后台 Logs 都能看到
        console.error('[sync] ' + err.message);
      })
    );
  },

  // 手动触发 / 健康检查：GET /?key=<MANUAL_KEY>
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (url.pathname === '/' && (!env.MANUAL_KEY || key === env.MANUAL_KEY)) {
      try {
        const out = await dispatch(env);
        return Response.json({ ...out, triggeredAt: new Date().toISOString() });
      } catch (err) {
        return Response.json({ ok: false, error: err.message }, { status: 502 });
      }
    }

    return Response.json({
      ok: true,
      hint: 'GET /?key=<MANUAL_KEY> 可手动触发一次同步',
    });
  },
};
