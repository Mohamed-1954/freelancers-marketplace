import type { Request, Response } from "express";
import type { CreateJobRequest, SelectJobsRequest, UpdateJobRequest } from "./request-types";
import db from "@/db";
import { jobs } from "@/db/schemas";
import { and, desc, eq, sql } from "drizzle-orm";
import { selectJobSchema } from "./validations";

export const createJob = async (req: CreateJobRequest, res: Response) => {
  try {
    const clientId = req.user.userId; // Client ID from authenticated user
    const validatedData = req.body;

    const [newJob] = await db.insert(jobs).values({
      ...validatedData,
      clientId: clientId,
      // postedDate is default now()
    }).returning();

    if (!newJob) {
      res.status(500).json({ message: "Failed to create job." });
      return;
    }

    res.status(201).json(newJob);
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listJobs = async (req: SelectJobsRequest, res: Response) => {
  try {
    // Use validated data from the middleware
    // Zod validation is already done by validateRequest middleware
    // The schema used was selectJobSchema
    const validatedQuery = req.validatedData?.query;

    // Add a check if validatedQuery is undefined (shouldn't happen if middleware ran)
    if (!validatedQuery) {
      console.error("Error: Validated query data not found in request.");
      return res.status(500).json({ message: "Internal server error processing request." })
    }

    // Destructure directly from validatedQuery
    const { clientId, status, search, limit, offset } = validatedQuery;

    const conditions = [];
    if (status) {
      conditions.push(eq(jobs.status, status));
    }
    if (search) {
      // Search in title and description (case-insensitive)
      conditions.push(sql`(${jobs.title} ILIKE ${`%${search}%`} OR ${jobs.description} ILIKE ${`%${search}%`})`);
      // For better performance, consider PostgreSQL Full-Text Search index
      // conditions.push(sql`to_tsvector('english', ${jobs.title} || ' ' || ${jobs.description}) @@ plainto_tsquery('english', ${search})`);
    }
    if (clientId) {
      conditions.push(eq(jobs.clientId, clientId));
    }
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const jobList = await db.query.jobs.findMany({
      where: whereCondition,
      columns: { // Select only necessary fields for listing
        jobId: true,
        title: true,
        status: true,
        postedDate: true,
        clientId: true,
        // description: true, // Maybe omit description for list view?
      },
      with: { // Include client username AND ID for display/linking
        client: { columns: { userId: true, username: true } }
      },
      limit: limit,
      offset: offset,
      orderBy: [desc(jobs.postedDate)] // Order by most recent first
    });

    // Get total count for pagination
    const totalCountResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(whereCondition);
    const totalCount = totalCountResult[0]?.count ?? 0;

    res.status(200).json({
      jobs: jobList,
      pagination: { limit, offset, total: totalCount }
    });

  } catch (error) {
    console.error("Error listing jobs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getJobDetails = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.jobId, jobId),
      with: { // Include related data
        client: { columns: { userId: true, username: true, profilePictureUrl: true } }
        // applications: true // Could include applications count or list (careful with size)
      }
    });

    if (!job) {
      res.status(404).json({ message: "Job not found." });
      return;
    }
    res.status(200).json(job);

  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateJob = async (req: UpdateJobRequest, res: Response) => {
  try {
    const jobId = req.params.jobId;
    // Ownership already checked by middleware
    const validatedData = req.body;

    if (Object.keys(validatedData).length === 0) {
      res.status(400).json({ message: "No update data provided." });
      return;
    }

    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...validatedData,
        // updatedAt: new Date() // If not using $onUpdate
      })
      .where(eq(jobs.jobId, jobId)) // Already know user is owner from middleware
      .returning();

    if (!updatedJob) {
      res.status(404).json({ message: "Job not found or update failed." });
      return;
    }

    res.status(200).json({ message: "Job updated successfully", job: updatedJob });

  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    // Ownership already checked by middleware

    // Consider job status - maybe only allow deletion if status is 'Open' or 'Cancelled'?
    // const job = await db.query.jobs.findFirst({ where: eq(jobs.jobId, jobId), columns: { status: true } });
    // if (job?.status === 'InProgress' || job?.status === 'Completed') {
    //    return res.status(400).json({ message: "Cannot delete a job that is in progress or completed." });
    // }

    const [deletedJob] = await db
      .delete(jobs)
      .where(eq(jobs.jobId, jobId))
      .returning({ id: jobs.jobId });

    if (!deletedJob) {
      res.status(404).json({ message: "Job not found or delete failed." });
      return;
    }

    res.status(200).json({ message: "Job deleted successfully." }); // Or 204 No Content
  } catch (error) {
    console.error("Error deleting job:", error);
    // Handle potential foreign key constraint errors if ON DELETE is RESTRICT
    res.status(500).json({ message: "Internal Server Error" });
  }
};