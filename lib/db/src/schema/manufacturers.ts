import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const manufacturersTable = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),
  moq: integer("moq"),
  turnaround: text("turnaround").notNull().default("7-10 days"),
  sustainable: boolean("sustainable").notNull().default(false),
  specialties: text("specialties").array().notNull().default([]),
  countries: text("countries").array().notNull().default([]),
  hasApi: boolean("has_api").notNull().default(false),
  rating: real("rating"),
});

export const insertManufacturerSchema = createInsertSchema(manufacturersTable).omit({ id: true });
export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturersTable.$inferSelect;
