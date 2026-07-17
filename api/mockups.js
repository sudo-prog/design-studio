const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  const q = u.searchParams;
  switch (p) {
    case "/api/mockups": return c.mockups(res);
    case "/api/mockup-templates": return c.mockupTemplates(res, q);
    default: return c.notFound(res, req.url);
  }
}
