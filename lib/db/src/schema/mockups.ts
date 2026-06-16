import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const mockupsTable = pgTable("mockups", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull(),
  name: text("name"),
  designAssetUrl: text("design_asset_url"),
  resultUrl: text("result_url"),
  garmentColor: text("garment_color"),
  blendMode: text("blend_mode"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMockupSchema = createInsertSchema(mockupsTable).omit({ id: true, createdAt: true });
export type InsertMockup = z.infer<typeof insertMockupSchema>;
export type Mockup = typeof mockupsTable.$inferSelect;
