const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  switch (p) {
    case "/api/collections": return c.collections(res);
    default: return c.notFound(res, req.url);
  }
}
