import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  brief: text("brief"),
  vibe: text("vibe"),
  status: text("status").notNull().default("draft"),
  coverAssetUrl: text("cover_asset_url"),
  colorPalette: text("color_palette").array().notNull().default([]),
  printMethod: text("print_method"),
  estimatedQuantity: integer("estimated_quantity"),
  githubRepo: text("github_repo"),
  githubPat: text("github_pat"),
  lastBackupAt: timestamp("last_backup_at", { withTimezone: true }),
  moodBoard: jsonb("mood_board").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
