import { 
  type User, 
  type InsertUser,
  type BusinessData,
  type InsertBusinessData,
  type ProcessingJob,
  type InsertProcessingJob,
  type BusinessRecord,
  type InsertBusinessRecord
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Business data operations
  createBusinessData(data: InsertBusinessData): Promise<BusinessData>;
  getBusinessData(id: string): Promise<BusinessData | undefined>;
  updateBusinessData(id: string, updates: Partial<BusinessData>): Promise<BusinessData | undefined>;
  getUserBusinessData(userId: string): Promise<BusinessData[]>;

  // Processing job operations
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: string): Promise<ProcessingJob | undefined>;
  updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  getJobsByBusinessData(businessDataId: string): Promise<ProcessingJob[]>;

  // Business record operations
  createBusinessRecord(record: InsertBusinessRecord): Promise<BusinessRecord>;
  createBusinessRecords(records: InsertBusinessRecord[]): Promise<BusinessRecord[]>;
  getBusinessRecords(businessDataId: string): Promise<BusinessRecord[]>;
  updateBusinessRecord(id: string, updates: Partial<BusinessRecord>): Promise<BusinessRecord | undefined>;
  deleteBusinessRecord(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private businessData: Map<string, BusinessData> = new Map();
  private processingJobs: Map<string, ProcessingJob> = new Map();
  private businessRecords: Map<string, BusinessRecord> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createBusinessData(data: InsertBusinessData): Promise<BusinessData> {
    const id = randomUUID();
    const now = new Date();
    const businessData: BusinessData = { 
      ...data,
      status: data.status || 'uploaded',
      totalRecords: data.totalRecords || 0,
      processedRecords: data.processedRecords || 0,
      verifiedRecords: data.verifiedRecords || 0,
      errorRecords: data.errorRecords || 0,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.businessData.set(id, businessData);
    return businessData;
  }

  async getBusinessData(id: string): Promise<BusinessData | undefined> {
    return this.businessData.get(id);
  }

  async updateBusinessData(id: string, updates: Partial<BusinessData>): Promise<BusinessData | undefined> {
    const existing = this.businessData.get(id);
    if (!existing) return undefined;
    
    const updated: BusinessData = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.businessData.set(id, updated);
    return updated;
  }

  async getUserBusinessData(userId: string): Promise<BusinessData[]> {
    return Array.from(this.businessData.values()).filter(data => data.userId === userId);
  }

  async createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob> {
    const id = randomUUID();
    const now = new Date();
    const processingJob: ProcessingJob = { 
      ...job,
      status: job.status || 'pending',
      progress: job.progress || 0,
      id, 
      createdAt: now,
      startedAt: null,
      completedAt: null
    };
    this.processingJobs.set(id, processingJob);
    return processingJob;
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    return this.processingJobs.get(id);
  }

  async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const existing = this.processingJobs.get(id);
    if (!existing) return undefined;
    
    const updated: ProcessingJob = { ...existing, ...updates };
    this.processingJobs.set(id, updated);
    return updated;
  }

  async getJobsByBusinessData(businessDataId: string): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values()).filter(job => job.businessDataId === businessDataId);
  }

  async createBusinessRecord(record: InsertBusinessRecord): Promise<BusinessRecord> {
    const id = randomUUID();
    const now = new Date();
    const businessRecord: BusinessRecord = { 
      ...record,
      status: record.status || 'pending',
      isDeleted: record.isDeleted || false,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.businessRecords.set(id, businessRecord);
    return businessRecord;
  }

  async createBusinessRecords(records: InsertBusinessRecord[]): Promise<BusinessRecord[]> {
    const results: BusinessRecord[] = [];
    for (const record of records) {
      const created = await this.createBusinessRecord(record);
      results.push(created);
    }
    return results;
  }

  async getBusinessRecords(businessDataId: string): Promise<BusinessRecord[]> {
    return Array.from(this.businessRecords.values()).filter(record => 
      record.businessDataId === businessDataId && !record.isDeleted
    );
  }

  async updateBusinessRecord(id: string, updates: Partial<BusinessRecord>): Promise<BusinessRecord | undefined> {
    const existing = this.businessRecords.get(id);
    if (!existing) return undefined;
    
    const updated: BusinessRecord = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.businessRecords.set(id, updated);
    return updated;
  }

  async deleteBusinessRecord(id: string): Promise<boolean> {
    const existing = this.businessRecords.get(id);
    if (!existing) return false;
    
    await this.updateBusinessRecord(id, { isDeleted: true });
    return true;
  }
}

export const storage = new MemStorage();
