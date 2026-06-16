import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const printJobsTable = pgTable("print_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  sourceAssetUrl: text("source_asset_url"),
  channelCount: integer("channel_count").notNull().default(4),
  lpi: integer("lpi").notNull().default(65),
  dotShape: text("dot_shape").notNull().default("round"),
  status: text("status").notNull().default("pending"),
  outputZipUrl: text("output_zip_url"),
  channels: jsonb("channels").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPrintJobSchema = createInsertSchema(printJobsTable).omit({ id: true, createdAt: true });
export type InsertPrintJob = z.infer<typeof insertPrintJobSchema>;
export type PrintJob = typeof printJobsTable.$inferSelect;
