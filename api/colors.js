const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  switch (p) {
    case "/api/colors/extract": return c.colorsExtract(res);
    default: return c.notFound(res, req.url);
  }
}
