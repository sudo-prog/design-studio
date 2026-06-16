import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
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

const router: IRouter = Router();

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
  const totalCogs = base + print + shipping;
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
      platformFees: parseFloat((totalCogs * 0.03).toFixed(2)),
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

export default router;
