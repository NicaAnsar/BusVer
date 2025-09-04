import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const businessData = pgTable("business_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  fileName: text("file_name").notNull(),
  originalData: jsonb("original_data").notNull(),
  mappedData: jsonb("mapped_data"),
  processedData: jsonb("processed_data"),
  status: text("status").notNull().default("uploaded"), // uploaded, mapped, processing, completed, error
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  verifiedRecords: integer("verified_records").default(0),
  errorRecords: integer("error_records").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessDataId: varchar("business_data_id").references(() => businessData.id),
  type: text("type").notNull(), // verification, prospecting
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, stopped
  progress: integer("progress").default(0),
  results: jsonb("results"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const businessRecords = pgTable("business_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessDataId: varchar("business_data_id").references(() => businessData.id),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  industry: text("industry"),
  status: text("status").default("pending"), // verified, updated, error, new
  verificationData: jsonb("verification_data"),
  originalRowIndex: integer("original_row_index"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBusinessDataSchema = createInsertSchema(businessData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertBusinessRecordSchema = createInsertSchema(businessRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type BusinessData = typeof businessData.$inferSelect;
export type InsertBusinessData = z.infer<typeof insertBusinessDataSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type BusinessRecord = typeof businessRecords.$inferSelect;
export type InsertBusinessRecord = z.infer<typeof insertBusinessRecordSchema>;

// API schemas
export const fileUploadSchema = z.object({
  fileName: z.string(),
  data: z.array(z.record(z.string(), z.any())),
});

export const columnMappingSchema = z.object({
  businessDataId: z.string(),
  mapping: z.record(z.string(), z.string()),
});

export const processingRequestSchema = z.object({
  businessDataId: z.string(),
  type: z.enum(["verification", "prospecting"]),
  options: z.record(z.string(), z.any()).optional(),
});

export const prospectingRequestSchema = z.object({
  businessType: z.string(),
  location: z.string().optional(),
  numberOfResults: z.number().min(1).max(1000).default(50),
  industryFilter: z.string().optional(),
});

export type FileUploadRequest = z.infer<typeof fileUploadSchema>;
export type ColumnMappingRequest = z.infer<typeof columnMappingSchema>;
export type ProcessingRequest = z.infer<typeof processingRequestSchema>;
export type ProspectingRequest = z.infer<typeof prospectingRequestSchema>;
