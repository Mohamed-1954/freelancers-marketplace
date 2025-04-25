import type { Request, Response, NextFunction } from "express";
import db from "@/db";
import { applications } from "@/db/schemas";
import { and, eq } from "drizzle-orm";

// Checks if the logged-in user is the worker who submitted OR the client who owns the related job
export const ensureApplicationViewer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params.applicationId;
    const user = req.user;

    if (!applicationId || !user) {
      res.status(400).json({ message: "Missing application ID or user context." });
      return;
    }

    const application = await db.query.applications.findFirst({
      where: eq(applications.applicationId, applicationId),
      columns: { workerId: true },
      with: { job: { columns: { clientId: true } } }
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    const isWorkerOwner = user.userType === "Worker" && application.workerId === user.userId;
    const isClientOwner = user.userType === "Client" && application.job?.clientId === user.userId;

    if (!isWorkerOwner && !isClientOwner) {
      res.status(403).json({ message: "Forbidden: You are not authorized to view this application." });
      return;
    }

    next();
  } catch (error) {
    console.error("Error checking application viewer permission:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Checks if the logged-in WORKER submitted the application
export const ensureWorkerOwnsApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params.applicationId;
    const workerId = req.user?.userId; // Assumes user is authenticated and is a Worker

    if (!applicationId || !workerId) {
      res.status(400).json({ message: "Missing application ID or user context." });
      return;
    }

    const application = await db.query.applications.findFirst({
      where: and(
        eq(applications.applicationId, applicationId),
        eq(applications.workerId, workerId)
      ),
      columns: { applicationId: true }, // Only need to confirm existence
    });

    if (!application) {
      res.status(403).json({ message: "Forbidden: You do not own this application." });
      return;
    }

    next(); // User is the worker owner
  } catch (error) {
    console.error("Error checking worker application ownership:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
