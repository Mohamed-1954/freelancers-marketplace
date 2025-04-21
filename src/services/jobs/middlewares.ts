import type { Request, Response, NextFunction } from "express";
import db from "@/db";
import { jobs } from "@/db/schemas";
import { eq } from "drizzle-orm";

export const ensureJobOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId;
    const clientId = req.user?.userId; // Assumes user is authenticated and is a Client

    if (!jobId || !clientId) {
      res.status(400).json({ message: "Missing job ID or user context." });
      return;
    }

    const job = await db.query.jobs.findFirst({
      where: eq(jobs.jobId, jobId),
      columns: { clientId: true }, // Only need the owner's ID
    });

    if (!job) {
      res.status(404).json({ message: "Job not found." });
      return;
    }

    if (job.clientId !== clientId) {
      res.status(403).json({ message: "Forbidden: You do not own this job." });
      return;
    }

    next(); // User is the owner
  } catch (error) {
    console.error("Error checking job ownership:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};