// Cloudflare Worker cron: start the GitHub Actions "hourly" workflow at :20 every hour.
// GitHub's own `schedule` trigger never fired for this repo, so this is the clock.
// Secret GH_TOKEN: fine-grained PAT limited to this repo, "Actions: Read and write".

const WORKFLOW = "https://api.github.com/repos/myjohn28542/kwanmajaknai/actions/workflows/hourly.yml/dispatches";

async function dispatch(env) {
  const r = await fetch(WORKFLOW, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kwanmajaknai-trigger",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (r.status !== 204) throw new Error(`dispatch failed: ${r.status} ${await r.text()}`);
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },
};
