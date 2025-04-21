import { Router } from "express";
import {
  createJob,
  listJobs,
  getJobDetails,
  updateJob,
  deleteJob,
} from "./handlers";
import { ensureClient, ensureWorker } from "../user/middlewares"; // Re-use middleware
import { validateRequest } from "@/common/middlewares";
import { createJobSchema, jobIdParamSchema, selectJobSchema, updateJobSchema } from "./validations";
import { ensureJobOwner } from "./middlewares"; // Specific middleware for job ownership

const router = Router();

// POST /jobs - Create a new job (Client only)
router.post(
  "/",
  ensureClient, // Only clients can create jobs
  validateRequest({ body: createJobSchema }),
  createJob
);

// GET /jobs - List/Search jobs
router.get(
  "/",
  validateRequest({ query: selectJobSchema }),
  listJobs
);

// GET /jobs/:jobId - Get specific job details
router.get(
  "/:jobId",
  validateRequest({ params: jobIdParamSchema }),
  getJobDetails
);

// PUT /jobs/:jobId - Update a job (Client only, owner only)
router.put(
  "/:jobId",
  ensureClient,
  validateRequest({ params: jobIdParamSchema, body: updateJobSchema }),
  ensureJobOwner, 
  updateJob
);

// DELETE /jobs/:jobId - Cancel/Delete a job (Client only, owner only)
router.delete(
  "/:jobId",
  ensureClient, 
  validateRequest({ params: jobIdParamSchema }),
  ensureJobOwner, 
  deleteJob
);

export default router;