// Shared API surface for Design Studio on Vercel.
// Imported by the per-route serverless function files in ../api/*.
// Returns valid contract-shaped JSON so the frontend data layer resolves
// with zero console errors (graceful empty states + stateless reference data).

const MOCKUP_TEMPLATES = [
  { id: "tshirt-front", name: "T-Shirt Front", category: "tops", thumbnailUrl: "/mockups/tshirt-front.svg", tags: ["tshirt","apparel"], anchorPoints: [[0.30,0.25],[0.70,0.25],[0.70,0.65],[0.30,0.65]] },
  { id: "tshirt-back", name: "T-Shirt Back", category: "tops", thumbnailUrl: "/mockups/tshirt-back.svg", tags: ["tshirt","apparel"], anchorPoints: [[0.28,0.22],[0.72,0.22],[0.72,0.62],[0.28,0.62]] },
  { id: "hoodie-front", name: "Hoodie Front", category: "tops", thumbnailUrl: "/mockups/hoodie-front.svg", tags: ["hoodie","apparel"], anchorPoints: [[0.25,0.20],[0.75,0.20],[0.75,0.65],[0.25,0.65]] },
  { id: "hoodie-back", name: "Hoodie Back", category: "tops", thumbnailUrl: "/mockups/hoodie-back.svg", tags: ["hoodie","apparel"], anchorPoints: [[0.25,0.20],[0.75,0.20],[0.75,0.65],[0.25,0.65]] },
  { id: "longsleeve-front", name: "Long Sleeve Front", category: "tops", thumbnailUrl: "/mockups/longsleeve-front.svg", tags: ["longsleeve","apparel"], anchorPoints: [[0.30,0.22],[0.70,0.22],[0.70,0.60],[0.30,0.60]] },
  { id: "crewneck-front", name: "Crewneck Sweatshirt", category: "tops", thumbnailUrl: "/mockups/crewneck-front.svg", tags: ["crewneck","apparel"], anchorPoints: [[0.25,0.20],[0.75,0.20],[0.75,0.65],[0.25,0.65]] },
  { id: "tank-front", name: "Tank Top", category: "tops", thumbnailUrl: "/mockups/tank-front.svg", tags: ["tank","apparel"], anchorPoints: [[0.30,0.15],[0.70,0.15],[0.70,0.70],[0.30,0.70]] },
  { id: "polo-front", name: "Polo Shirt", category: "tops", thumbnailUrl: "/mockups/polo-front.svg", tags: ["polo","apparel"], anchorPoints: [[0.30,0.25],[0.70,0.25],[0.70,0.65],[0.30,0.65]] },
  { id: "raglan-front", name: "Raglan / Baseball Tee", category: "tops", thumbnailUrl: "/mockups/raglan-front.svg", tags: ["raglan","baseball","apparel"], anchorPoints: [[0.28,0.22],[0.72,0.22],[0.72,0.62],[0.28,0.62]] },
  { id: "zip-hoodie-front", name: "Zip Hoodie Front", category: "tops", thumbnailUrl: "/mockups/zip-hoodie-front.svg", tags: ["hoodie","zip","apparel"], anchorPoints: [[0.28,0.18],[0.72,0.18],[0.72,0.62],[0.28,0.62]] },
  { id: "cap-front", name: "Cap Front", category: "accessories", thumbnailUrl: "/mockups/cap-front.svg", tags: ["cap","hat","accessories"], anchorPoints: [[0.30,0.30],[0.70,0.30],[0.65,0.55],[0.35,0.55]] },
  { id: "tote-front", name: "Tote Bag", category: "accessories", thumbnailUrl: "/mockups/tote-front.svg", tags: ["tote","bag","accessories"], anchorPoints: [[0.22,0.20],[0.78,0.20],[0.78,0.75],[0.22,0.75]] },
  { id: "phone-case", name: "Phone Case", category: "accessories", thumbnailUrl: "/mockups/phone-case.svg", tags: ["phone","case","accessories"], anchorPoints: [[0.22,0.15],[0.78,0.15],[0.78,0.85],[0.22,0.85]] },
  { id: "beanie-front", name: "Beanie", category: "accessories", thumbnailUrl: "/mockups/beanie-front.svg", tags: ["beanie","hat","accessories"], anchorPoints: [[0.30,0.20],[0.70,0.20],[0.70,0.55],[0.30,0.55]] },
  { id: "sticker-sheet", name: "Sticker Sheet", category: "accessories", thumbnailUrl: "/mockups/sticker-sheet.svg", tags: ["sticker","accessories"], anchorPoints: [[0.15,0.15],[0.85,0.15],[0.85,0.85],[0.15,0.85]] },
  { id: "mug-wrap", name: "Mug Wrap", category: "accessories", thumbnailUrl: "/mockups/mug-wrap.svg", tags: ["mug","drinkware"], anchorPoints: [[0.22,0.28],[0.78,0.28],[0.78,0.84],[0.22,0.84]] },
  { id: "pin-button", name: "Pin / Button Badge", category: "accessories", thumbnailUrl: "/mockups/pin-button.svg", tags: ["pin","button","accessories"], anchorPoints: [[0.15,0.15],[0.85,0.15],[0.85,0.85],[0.15,0.85]] },
  { id: "poster-a2", name: "Poster A2", category: "flat", thumbnailUrl: "/mockups/poster-a2.svg", tags: ["poster","print"], anchorPoints: [[0.10,0.08],[0.90,0.08],[0.90,0.92],[0.10,0.92]] },
  { id: "poster-a3", name: "Poster A3 (Framed)", category: "flat", thumbnailUrl: "/mockups/poster-a3.svg", tags: ["poster","print","framed"], anchorPoints: [[0.12,0.10],[0.88,0.10],[0.88,0.90],[0.12,0.90]] },
  { id: "notebook-cover", name: "Notebook Cover", category: "flat", thumbnailUrl: "/mockups/notebook-cover.svg", tags: ["notebook","print"], anchorPoints: [[0.26,0.10],[0.86,0.10],[0.86,0.88],[0.26,0.88]] },
  { id: "canvas-print", name: "Canvas Print", category: "flat", thumbnailUrl: "/mockups/canvas-print.svg", tags: ["canvas","print","art"], anchorPoints: [[0.08,0.08],[0.92,0.08],[0.92,0.92],[0.08,0.92]] },
];

const MANUFACTURERS = [
  { id: 1, name: "Printful", type: "pod", website: "https://printful.com", moq: 1, turnaround: "3-5 days", sustainable: false, specialties: ["DTG","Embroidery","All-over print"], countries: ["US","EU","UK"], hasApi: true, rating: 4.6 },
  { id: 2, name: "Printify", type: "pod", website: "https://printify.com", moq: 1, turnaround: "3-7 days", sustainable: false, specialties: ["DTG","Sublimation","Cut & sew"], countries: ["US","UK","CA","AU"], hasApi: true, rating: 4.4 },
  { id: 3, name: "Gelato", type: "pod", website: "https://gelato.com", moq: 1, turnaround: "3-5 days", sustainable: true, specialties: ["DTG","Wall art","Cards"], countries: ["33+ countries"], hasApi: true, rating: 4.5 },
  { id: 4, name: "S&S Activewear", type: "screen_print", website: "https://ssactivewear.com", moq: 12, turnaround: "7-10 days", sustainable: false, specialties: ["Screen Print","Fleece","Headwear"], countries: ["US"], hasApi: false, rating: 4.2 },
  { id: 5, name: "CustomInk", type: "screen_print", website: "https://customink.com", moq: 6, turnaround: "7-14 days", sustainable: false, specialties: ["Screen Print","DTG","Embroidery"], countries: ["US"], hasApi: false, rating: 4.3 },
  { id: 6, name: "Stitch It", type: "embroidery", website: null, moq: 12, turnaround: "10-14 days", sustainable: false, specialties: ["Embroidery","Patches","Monogram"], countries: ["US","CA"], hasApi: false, rating: 4.1 },
  { id: 7, name: "T&T Industries", type: "screen_print", website: null, moq: 48, turnaround: "14-21 days", sustainable: false, specialties: ["Screen Print","Discharge","Water-based inks"], countries: ["US"], hasApi: false, rating: 4.0 },
  { id: 8, name: "Print Aura", type: "pod", website: "https://printaura.com", moq: 1, turnaround: "5-7 days", sustainable: false, specialties: ["DTG","Embroidery","Cut & sew"], countries: ["US"], hasApi: true, rating: 4.2 },
  { id: 9, name: "EcoTee", type: "mixed", website: null, moq: 24, turnaround: "14-18 days", sustainable: true, specialties: ["Organic cotton","Water-based","Screen Print"], countries: ["DE","NL"], hasApi: false, rating: 4.7 },
  { id: 10, name: "SPOD", type: "pod", website: "https://spod.com", moq: 1, turnaround: "2-4 days", sustainable: true, specialties: ["DTG","Sublimation","Fast fulfillment"], countries: ["US","EU"], hasApi: true, rating: 4.3 },
];

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getPricing(quantity, method) {
  const bcpu = method === "dtg" ? 8.5 : method === "embroidery" ? 12 : 6;
  const pcpu = method === "screen_print" ? 2.5 : method === "dtg" ? 3 : 5;
  const base = bcpu * quantity, print = pcpu * quantity, shipping = 1.2 * quantity;
  const fees = (base + print + shipping) * 0.03, cogs = base + print + shipping, retail = (cogs / quantity) * 3.5;
  const margin = ((retail - cogs / quantity) / retail) * 100;
  const mk = (q) => {
    const f = q >= 250 ? 0.8 : q >= 100 ? 0.9 : q >= 48 ? 1.0 : 1.1;
    const ppu = parseFloat((bcpu + pcpu) * f.toFixed(2));
    return { quantity: q, pricePerUnit: ppu, totalCost: parseFloat((ppu * q).toFixed(2)), marginAtRetail: parseFloat(((retail - ppu) / retail * 100).toFixed(1)) };
  };
  return {
    baseCost: +base.toFixed(2), printingCost: +print.toFixed(2), shippingCost: +shipping.toFixed(2),
    platformFees: +fees.toFixed(2), totalCogs: +cogs.toFixed(2), suggestedRetail: +(retail * quantity).toFixed(2),
    marginPercent: +margin.toFixed(1), bulkTiers: [24, 48, 100, 250].map(mk),
  };
}

function health(res) { json(res, 200, { status: "ok", app: "design-studio" }); }
function aiChat(res) { json(res, 501, { error: "Not Implemented", note: "Wire backend here" }); }
function manufacturingPricing(res, q) { json(res, 200, getPricing(parseInt(q.get("quantity") || "100", 10) || 100, q.get("printMethod") || "screen_print")); }
function manufacturingManufacturers(res) { json(res, 200, MANUFACTURERS); }
function manufacturingOrders(res) { json(res, 200, []); }
function manufacturingRfq(res) { json(res, 200, { ok: true, note: "RFQ received (demo mode)" }); }
function mockupTemplates(res, q) { const c = q.get("category"); json(res, 200, c ? MOCKUP_TEMPLATES.filter((t) => t.category === c) : MOCKUP_TEMPLATES); }
function mockups(res) { json(res, 200, []); }
function collections(res) { json(res, 200, []); }
function aiJobs(res) { json(res, 200, []); }
function dashboardSummary(res) { json(res, 200, { activeProjects: 0, totalProjects: 0, readyToPrint: 0, pendingAiJobs: 0, totalAssets: 0 }); }
function dashboardActivity(res) { json(res, 200, []); }
function projects(res) { json(res, 200, []); }
function projectById(res) { json(res, 404, { error: "Project not found" }); }
function projectRestore(res) { json(res, 200, { ok: true }); }
function projectAssetsUrl(res) { json(res, 200, { url: null }); }
function projectAssets(res) { json(res, 200, []); }
function projectHistory(res) { json(res, 200, []); }
function projectBackup(res) { json(res, 200, { ok: true, note: "Backup is a no-op in demo mode" }); }
function projectPalettes(res) { json(res, 200, []); }
function colorsExtract(res) { json(res, 200, { colors: [] }); }
function techPacks(res) { json(res, 200, []); }
function printJobs(res) { json(res, 200, []); }
function assetsById(res) { json(res, 404, { error: "Asset not found" }); }
function aiJobById(res) { json(res, 404, { error: "Job not found" }); }
function aiJobApprove(res) { json(res, 200, { ok: true }); }
function aiJobReject(res) { json(res, 200, { ok: true }); }
function aiGenerate(res) { json(res, 501, { error: "Not Implemented" }); }
function aiStyleTransfer(res) { json(res, 501, { error: "Not Implemented" }); }
function aiRemoveBg(res) { json(res, 501, { error: "Not Implemented" }); }
function notFound(res, p) { json(res, 404, { error: "Not found", path: p }); }

module.exports = {
  json, health, aiChat, manufacturingPricing, manufacturingManufacturers, manufacturingOrders,
  manufacturingRfq, mockupTemplates, mockups, collections, aiJobs, dashboardSummary, dashboardActivity,
  projects, projectById, projectRestore, projectAssetsUrl, projectAssets, projectHistory, projectBackup,
  projectPalettes, colorsExtract, techPacks, printJobs, assetsById, aiJobById, aiJobApprove, aiJobReject,
  aiGenerate, aiStyleTransfer, aiRemoveBg, notFound,
};
