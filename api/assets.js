const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  if (/^\/api\/assets\/[^/]+$/.test(p)) return c.assetsById(res);
  return c.notFound(res, req.url);
}
