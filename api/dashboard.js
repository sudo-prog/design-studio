const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  switch (p) {
    case "/api/dashboard/summary": return c.dashboardSummary(res);
    case "/api/dashboard/activity": return c.dashboardActivity(res);
    default: return c.notFound(res, req.url);
  }
}
