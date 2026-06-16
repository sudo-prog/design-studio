import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { manufacturersTable } from "./manufacturers";

export const manufacturingOrdersTable = pgTable("manufacturing_orders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  manufacturerId: integer("manufacturer_id").notNull().references(() => manufacturersTable.id),
  status: text("status").notNull().default("draft"),
  quantity: integer("quantity").notNull(),
  totalCost: real("total_cost"),
  notes: text("notes"),
  mockupAssetUrl: text("mockup_asset_url"),
  externalOrderId: text("external_order_id"),
  trackingUrl: text("tracking_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertManufacturingOrderSchema = createInsertSchema(manufacturingOrdersTable).omit({ id: true, createdAt: true });
export type InsertManufacturingOrder = z.infer<typeof insertManufacturingOrderSchema>;
export type ManufacturingOrder = typeof manufacturingOrdersTable.$inferSelect;
