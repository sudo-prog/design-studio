const c = require("./_core.js");
export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "");
  const q = u.searchParams;
  switch (p) {
    case "/api/manufacturing/pricing": return c.manufacturingPricing(res, q);
    case "/api/manufacturing/manufacturers": return c.manufacturingManufacturers(res);
    case "/api/manufacturing/orders": return c.manufacturingOrders(res);
    case "/api/manufacturing/rfq": return c.manufacturingRfq(res);
    default: return c.notFound(res, req.url);
  }
}
