// Consolidated Design Studio API router (Vercel catch-all).
// Imports the shared mock surface from _core.js and routes every path the
// generated @workspace/api-client-react client actually calls.
const c = require("./_core.js");

export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  const q = u.searchParams;

  // health
  if (p === "/api/health" || p === "/api/healthz") return c.health(res);

  // dashboard
  if (p === "/api/dashboard/summary") return c.dashboardSummary(res);
  if (p === "/api/dashboard/activity") return c.dashboardActivity(res, q);

  // projects
  if (p === "/api/projects") return c.projects(res);
  let m;
  if ((m = p.match(/^\/api\/projects\/([^/]+)\/assets\/url$/))) return c.projectAssetsUrl(res);
  if ((m = p.match(/^\/api\/projects\/([^/]+)\/assets$/))) return c.projectAssets(res);
  if ((m = p.match(/^\/api\/projects\/([^/]+)\/backup$/))) return c.projectBackup(res);
  if ((m = p.match(/^\/api\/projects\/([^/]+)\/history$/))) return c.projectHistory(res);
  if ((m = p.match(/^\/api\/projects\/([^/]+)\/palettes$/))) return c.projectPalettes(res);
  if ((m = p.match(/^\/api\/projects\/([^/]+)\/restore\/([^/]+)$/))) return c.projectRestore(res);
  if ((m = p.match(/^\/api\/projects\/([^/]+)$/))) return c.projectById(res);

  // collections
  if (p === "/api/collections") return c.collections(res);

  // colors
  if (p === "/api/colors/extract") return c.colorsExtract(res);

  // assets
  if ((m = p.match(/^\/api\/assets\/([^/]+)$/))) return c.assetsById(res);

  // ai
  if (p === "/api/ai/chat") return c.aiChat(res);
  if (p === "/api/ai/generate") return c.aiGenerate(res);
  if (p === "/api/ai/remove-bg") return c.aiRemoveBg(res);
  if (p === "/api/ai/style-transfer") return c.aiStyleTransfer(res);
  if (p === "/api/ai/jobs") return c.aiJobs(res);
  if ((m = p.match(/^\/api\/ai\/jobs\/([^/]+)\/approve$/))) return c.aiJobApprove(res);
  if ((m = p.match(/^\/api\/ai\/jobs\/([^/]+)\/reject$/))) return c.aiJobReject(res);
  if ((m = p.match(/^\/api\/ai\/jobs\/([^/]+)$/))) return c.aiJobById(res);

  // manufacturing
  if (p === "/api/manufacturing/pricing") return c.manufacturingPricing(res, q);
  if (p === "/api/manufacturing/manufacturers") return c.manufacturingManufacturers(res);
  if (p === "/api/manufacturing/orders") return c.manufacturingOrders(res);
  if (p === "/api/manufacturing/rfq") return c.manufacturingRfq(res);

  // mockups
  if (p === "/api/mockups") return c.mockups(res);
  if (p === "/api/mockup-templates") return c.mockupTemplates(res, q);

  // tech-packs
  if (p === "/api/tech-packs") return c.techPacks(res);

  // print-jobs
  if (p === "/api/print-jobs") return c.printJobs(res);

  return c.notFound(res, req.url);
}
