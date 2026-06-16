import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const aiJobsTable = pgTable("ai_jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  provider: text("provider"),
  model: text("model"),
  aspectRatio: text("aspect_ratio"),
  quantity: integer("quantity").notNull().default(1),
  sourceAssetUrl: text("source_asset_url"),
  resultUrls: text("result_urls").array().notNull().default([]),
  selectedResultUrl: text("selected_result_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiJobSchema = createInsertSchema(aiJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiJob = z.infer<typeof insertAiJobSchema>;
export type AiJob = typeof aiJobsTable.$inferSelect;
