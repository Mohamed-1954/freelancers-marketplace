import type { Request, Response } from "express";
import type { ApplyJobRequest, UpdateApplicationStatusRequest } from "./request-types";
import db from "@/db";
import { applications, jobs } from "@/db/schemas";
import { and, eq } from "drizzle-orm";

export const applyForJob = async (req: ApplyJobRequest, res: Response) => {
  try {
    const workerId = req.user.userId;
    const { jobId } = req.body;

    // Optional: Check if job exists and is 'Open'
    const jobExists = await db.query.jobs.findFirst({
      where: and(eq(jobs.jobId, jobId), eq(jobs.status, "Open")),
      columns: { jobId: true }
    });
    if (!jobExists) {
      res.status(400).json({ message: "Job not found or is not open for applications." });
      return;
    }

    // Drizzle will handle the unique constraint (jobId, workerId) check
    const newApplication = await db.insert(applications).values({
      jobId: jobId,
      workerId: workerId,
      // submissionDate is default now()
      // status is default 'Submitted'
    }).returning();

    if (!newApplication || newApplication.length === 0) {
      res.status(500).json({ message: "Failed to submit application." });
      return;
    }

    res.status(201).json(newApplication[0]);

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } catch (error: any) {
    // Catch potential unique violation error
    if (error.code === "23505") { // PostgreSQL unique violation code
      res.status(409).json({ message: "You have already applied for this job." });
      return;
    }
    console.error("Error applying for job:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listApplications = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { jobId } = req.query; // Optional query param

    // Declare applicationList here with a suitable type
    let applicationList: unknown;

    if (user.userType === 'Worker') {
      // Worker sees their own applications
      // Await the query directly and assign to applicationList
      applicationList = await db.query.applications.findMany({
        where: eq(applications.workerId, user.userId),
        with: { job: { columns: { title: true, status: true } } }, // Include job info
        orderBy: (apps, { desc }) => [desc(apps.submissionDate)],
      });
    } else if (user.userType === 'Client' && typeof jobId === 'string') {
      // Client sees applications for a SPECIFIC job they own
      // First verify client owns the job
      const job = await db.query.jobs.findFirst({
        where: and(eq(jobs.jobId, jobId), eq(jobs.clientId, user.userId)),
        columns: { jobId: true }
      });
      if (!job) {
        res.status(403).json({ message: "Cannot view applications for a job you do not own." });
        return;
      }

      // Await the query directly and assign to applicationList
      applicationList = await db.query.applications.findMany({
        where: eq(applications.jobId, jobId),
        // Ensure the 'with' clause matches the ApplicationWithRelations type structure
        with: { worker: { columns: { userId: true, username: true, profilePictureUrl: true } } },
        orderBy: (apps, { desc }) => [desc(apps.submissionDate)],
      });
    } else {
      // Handle cases where a client didn't provide a jobId or other invalid scenarios
      if (user.userType === 'Client') {
          res.status(400).json({ message: "Clients must specify a valid jobId to list applications." });
      } else {
          // Potentially handle other user types or errors if necessary
          res.status(400).json({ message: "Invalid request." });
      }
      return;
    }

    // applicationList now holds the result from the correct branch
    res.status(200).json(applicationList);

  } catch (error) {
    console.error("Error listing applications:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getApplicationDetails = async (req: Request, res: Response) => {
  try {
    const applicationId = req.params.applicationId;
    // Authorization (view permission) checked by ensureApplicationViewer middleware

    // Use the defined type here as well if needed, or adjust based on the actual query
    const application: unknown = await db.query.applications.findFirst({
      where: eq(applications.applicationId, applicationId),
      with: { // Include related info based on who is viewing?
        job: { with: { client: { columns: { userId: true, username: true } } } },
        worker: { columns: { userId: true, username: true, profilePictureUrl: true } }
      }
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }
    res.status(200).json(application);

  } catch (error) {
    console.error("Error fetching application details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateApplicationStatus = async (req: UpdateApplicationStatusRequest, res: Response) => {
  try {
    const applicationId = req.params.applicationId;
    const { status } = req.body; // Validated status
    const clientId = req.user.userId; // Client performing the update

    // Verify client owns the job associated with this application
    const application = await db.query.applications.findFirst({
      where: eq(applications.applicationId, applicationId),
      columns: { applicationId: true }, // Need columns for join
      with: { job: { columns: { clientId: true, jobId: true } } }
    });

    if (!application?.job) {
      res.status(404).json({ message: "Application or associated job not found." });
      return;
    }
    if (application.job.clientId !== clientId) {
      res.status(403).json({ message: "Forbidden: You do not own the job for this application." });
      return;
    }

    // Prevent updating status if already accepted/rejected? Decide on state flow.
    // if (application.status === 'Accepted' || application.status === 'Rejected') { ... }

    const updatedApplication = await db.update(applications)
      .set({ status: status /*, updatedAt: new Date() */ })
      .where(eq(applications.applicationId, applicationId))
      .returning();

    if (!updatedApplication || updatedApplication.length === 0) {
      res.status(404).json({ message: "Application not found or update failed." });
      return;
    }

    // TODO: Potentially trigger notifications

    res.status(200).json({ message: "Application status updated.", application: updatedApplication[0] });

  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const withdrawApplication = async (req: Request, res: Response) => {
  try {
    const applicationId = req.params.applicationId;
    // Ownership checked by middleware ensureWorkerOwnsApplication

    // Maybe only allow withdrawal if status is 'Submitted' or 'Negotiating'?
    // const app = await db.query.applications.findFirst({ where: eq(applications.applicationId, applicationId), columns: {status: true} });
    // if (app?.status === 'Accepted' || app?.status === 'Rejected') { ... }

    const deletedApplication = await db
      .delete(applications)
      .where(eq(applications.applicationId, applicationId)) // Worker owns (checked by middleware)
      .returning({ id: applications.applicationId });

    if (!deletedApplication || deletedApplication.length === 0) {
      res.status(404).json({ message: "Application not found or delete failed." });
      return;
    }

    res.status(200).json({ message: "Application withdrawn successfully." }); // Or 204

  } catch (error) {
    console.error("Error withdrawing application:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};