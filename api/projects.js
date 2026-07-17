const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  if (p === "/api/projects") return c.projects(res);
  if (/^\/api\/projects\/[^/]+$/.test(p)) return c.projectById(res);
  if (/^\/api\/projects\/[^/]+\/assets\/url$/.test(p)) return c.projectAssetsUrl(res);
  if (/^\/api\/projects\/[^/]+\/assets$/.test(p)) return c.projectAssets(res);
  if (/^\/api\/projects\/[^/]+\/backup$/.test(p)) return c.projectBackup(res);
  if (/^\/api\/projects\/[^/]+\/history$/.test(p)) return c.projectHistory(res);
  if (/^\/api\/projects\/[^/]+\/palettes$/.test(p)) return c.projectPalettes(res);
  if (/^\/api\/projects\/[^/]+\/restore\/[^/]+$/.test(p)) return c.projectRestore(res);
  return c.notFound(res, req.url);
}
