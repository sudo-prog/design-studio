const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  if (p === "/api/ai/chat") return c.aiChat(res);
  if (p === "/api/ai/generate") return c.aiGenerate(res);
  if (p === "/api/ai/remove-bg") return c.aiRemoveBg(res);
  if (p === "/api/ai/style-transfer") return c.aiStyleTransfer(res);
  if (p === "/api/ai/jobs") return c.aiJobs(res);
  if (/^\/api\/ai\/jobs\/[^/]+\/approve$/.test(p)) return c.aiJobApprove(res);
  if (/^\/api\/ai\/jobs\/[^/]+\/reject$/.test(p)) return c.aiJobReject(res);
  if (/^\/api\/ai\/jobs\/[^/]+$/.test(p)) return c.aiJobById(res);
  return c.notFound(res, req.url);
}
