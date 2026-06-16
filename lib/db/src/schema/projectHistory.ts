import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectHistoryTable = pgTable("project_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectHistorySchema = createInsertSchema(projectHistoryTable).omit({ id: true, createdAt: true });
export type InsertProjectHistory = z.infer<typeof insertProjectHistorySchema>;
export type ProjectHistory = typeof projectHistoryTable.$inferSelect;
