import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const techPacksTable = pgTable("tech_packs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title"),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("pending"),
  garmentType: text("garment_type"),
  printMethod: text("print_method"),
  placement: text("placement"),
  dimensions: text("dimensions"),
  colorCount: integer("color_count"),
  notes: text("notes"),
  mockupAssetUrl: text("mockup_asset_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTechPackSchema = createInsertSchema(techPacksTable).omit({ id: true, createdAt: true });
export type InsertTechPack = z.infer<typeof insertTechPackSchema>;
export type TechPack = typeof techPacksTable.$inferSelect;
