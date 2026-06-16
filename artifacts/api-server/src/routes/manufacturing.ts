import { Router, type IRouter } from "express";
import { desc, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { manufacturersTable, manufacturingOrdersTable, activityLogTable } from "@workspace/db";
import {
  GetManufacturingPricingQueryParams,
  ListManufacturersQueryParams,
  CreateOrderBody,
  GetManufacturingPricingResponse,
  ListManufacturersResponse,
  ListOrdersResponse,
} from "@workspace/api-zod";
import { z } from "zod";
import { generateRfqPdf } from "./pdfGen";

// ── Seed curated manufacturers if table is empty ───────────────────────────
const SEED_MANUFACTURERS = [
  { name: "Printful", type: "pod" as const, website: "https://printful.com", moq: 1, turnaround: "3-5 days", sustainable: false, specialties: ["DTG", "Embroidery", "All-over print"], countries: ["US", "EU", "UK"], hasApi: true, rating: 4.6 },
  { name: "Printify", type: "pod" as const, website: "https://printify.com", moq: 1, turnaround: "3-7 days", sustainable: false, specialties: ["DTG", "Sublimation", "Cut & sew"], countries: ["US", "UK", "CA", "AU"], hasApi: true, rating: 4.4 },
  { name: "Gelato", type: "pod" as const, website: "https://gelato.com", moq: 1, turnaround: "3-5 days", sustainable: true, specialties: ["DTG", "Wall art", "Cards"], countries: ["33+ countries"], hasApi: true, rating: 4.5 },
  { name: "S&S Activewear", type: "screen_print" as const, website: "https://ssactivewear.com", moq: 12, turnaround: "7-10 days", sustainable: false, specialties: ["Screen Print", "Fleece", "Headwear"], countries: ["US"], hasApi: false, rating: 4.2 },
  { name: "CustomInk", type: "screen_print" as const, website: "https://customink.com", moq: 6, turnaround: "7-14 days", sustainable: false, specialties: ["Screen Print", "DTG", "Embroidery"], countries: ["US"], hasApi: false, rating: 4.3 },
  { name: "Stitch It", type: "embroidery" as const, website: "https://stitchit.com", moq: 12, turnaround: "10-14 days", sustainable: false, specialties: ["Embroidery", "Patches", "Monogram"], countries: ["US", "CA"], hasApi: false, rating: 4.1 },
  { name: "T&T Industries", type: "screen_print" as const, website: null, moq: 48, turnaround: "14-21 days", sustainable: false, specialties: ["Screen Print", "Discharge", "Water-based inks"], countries: ["US"], hasApi: false, rating: 4.0 },
  { name: "Print Aura", type: "pod" as const, website: "https://printaura.com", moq: 1, turnaround: "5-7 days", sustainable: false, specialties: ["DTG", "Embroidery", "Cut & sew"], countries: ["US"], hasApi: true, rating: 4.2 },
  { name: "EcoTee", type: "mixed" as const, website: null, moq: 24, turnaround: "14-18 days", sustainable: true, specialties: ["Organic cotton", "Water-based", "Screen Print"], countries: ["DE", "NL"], hasApi: false, rating: 4.7 },
  { name: "SPOD", type: "pod" as const, website: "https://spod.com", moq: 1, turnaround: "2-4 days", sustainable: true, specialties: ["DTG", "Sublimation", "Fast fulfillment"], countries: ["US", "EU"], hasApi: true, rating: 4.3 },
];

async function seedManufacturers() {
  const [{ total }] = await db.select({ total: count() }).from(manufacturersTable);
  if (total === 0) {
    await db.insert(manufacturersTable).values(SEED_MANUFACTURERS);
  }
}

const router: IRouter = Router();

// Seed on startup (async, non-blocking)
seedManufacturers().catch(console.error);

router.get("/manufacturing/pricing", async (req, res): Promise<void> => {
  const query = GetManufacturingPricingQueryParams.safeParse(req.query);
  const quantity = (query.success && query.data.quantity) ? query.data.quantity : 100;
  const method = (query.success && query.data.printMethod) ? query.data.printMethod : "screen_print";
  const baseCostPerUnit = method === "dtg" ? 8.5 : method === "embroidery" ? 12 : 6;
  const printCostPerUnit = method === "screen_print" ? 2.5 : method === "dtg" ? 3 : 5;
  const shippingCostPerUnit = 1.2;
  const base = baseCostPerUnit * quantity;
  const print = printCostPerUnit * quantity;
  const shipping = shippingCostPerUnit * quantity;
  const platformFees = (base + print + shipping) * 0.03;
  const totalCogs = base + print + shipping + platformFees;
  const suggestedRetail = totalCogs / quantity * 3.5;
  const marginPercent = ((suggestedRetail - totalCogs / quantity) / suggestedRetail) * 100;
  const bulkTiers = [
    { quantity: 24, pricePerUnit: (baseCostPerUnit + printCostPerUnit) * 1.1, totalCost: 0, marginAtRetail: null },
    { quantity: 48, pricePerUnit: (baseCostPerUnit + printCostPerUnit) * 1.0, totalCost: 0, marginAtRetail: null },
    { quantity: 100, pricePerUnit: (baseCostPerUnit + printCostPerUnit) * 0.9, totalCost: 0, marginAtRetail: null },
    { quantity: 250, pricePerUnit: (baseCostPerUnit + printCostPerUnit) * 0.8, totalCost: 0, marginAtRetail: null },
  ].map((t) => ({
    ...t,
    totalCost: parseFloat((t.pricePerUnit * t.quantity).toFixed(2)),
    pricePerUnit: parseFloat(t.pricePerUnit.toFixed(2)),
    marginAtRetail: parseFloat(((suggestedRetail - t.pricePerUnit) / suggestedRetail * 100).toFixed(1)),
  }));
  res.json(
    GetManufacturingPricingResponse.parse({
      baseCost: parseFloat(base.toFixed(2)),
      printingCost: parseFloat(print.toFixed(2)),
      shippingCost: parseFloat(shipping.toFixed(2)),
      platformFees: parseFloat(platformFees.toFixed(2)),
      totalCogs: parseFloat(totalCogs.toFixed(2)),
      suggestedRetail: parseFloat((suggestedRetail * quantity).toFixed(2)),
      marginPercent: parseFloat(marginPercent.toFixed(1)),
      bulkTiers,
    })
  );
});

router.get("/manufacturing/manufacturers", async (req, res): Promise<void> => {
  const query = ListManufacturersQueryParams.safeParse(req.query);
  let q = db.select().from(manufacturersTable).$dynamic();
  const rows = await q;
  res.json(ListManufacturersResponse.parse(rows));
});

router.get("/manufacturing/orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(manufacturingOrdersTable)
    .orderBy(desc(manufacturingOrdersTable.createdAt));
  res.json(ListOrdersResponse.parse(orders));
});

router.post("/manufacturing/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db
    .insert(manufacturingOrdersTable)
    .values({
      projectId: parsed.data.projectId,
      manufacturerId: parsed.data.manufacturerId,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes ?? null,
      mockupAssetUrl: parsed.data.mockupAssetUrl ?? null,
      status: "draft",
    })
    .returning();
  await db.insert(activityLogTable).values({
    type: "order_placed",
    description: `Manufacturing order placed for ${parsed.data.quantity} units`,
    projectId: parsed.data.projectId,
  });
  res.status(201).json(order);
});

// ── POST /api/manufacturing/rfq — generates RFQ PDF ────────────────────────
const GenerateRfqBody = z.object({
  companyName: z.string().min(1),
  contactEmail: z.string().optional(),
  projectName: z.string().optional(),
  garmentType: z.string().optional(),
  quantity: z.number().optional(),
  printMethod: z.string().optional(),
  colors: z.number().optional(),
  dimensions: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/manufacturing/rfq", async (req, res): Promise<void> => {
  const parsed = GenerateRfqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const pdfBuf = await generateRfqPdf({
    companyName: parsed.data.companyName,
    contactEmail: parsed.data.contactEmail ?? "",
    projectName: parsed.data.projectName ?? "Custom Order",
    garmentType: parsed.data.garmentType ?? "—",
    quantity: parsed.data.quantity ?? 0,
    printMethod: parsed.data.printMethod ?? "—",
    colors: parsed.data.colors ?? 1,
    dimensions: parsed.data.dimensions ?? "—",
    deliveryDate: parsed.data.deliveryDate ?? "TBD",
    notes: parsed.data.notes ?? "",
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="rfq-${Date.now()}.pdf"`);
  res.send(pdfBuf);
});

export default router;
