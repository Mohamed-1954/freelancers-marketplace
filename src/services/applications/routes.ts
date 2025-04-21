import { Router } from "express";
import {
    applyForJob,
    listApplications,
    getApplicationDetails,
    withdrawApplication,
    updateApplicationStatus,
} from "./handlers";
import { applyJobSchema, updateApplicationStatusSchema } from "./validations";
import { ensureApplicationViewer, ensureWorkerOwnsApplication } from "./middlewares";
import { ensureClient, ensureWorker } from "../users/middlewares";
import { validateRequest } from "@/common/middlewares";

const router = Router();

// POST /applications - Apply for a job (Worker only)
router.post(
    "/",
    ensureWorker,
    validateRequest({ body: applyJobSchema }),
    applyForJob
);

// GET /applications - List applications (for Worker or Client)
router.get("/", listApplications); // Logic inside handler determines view

// GET /applications/:applicationId - Get specific application details
router.get(
    "/:applicationId",
    ensureApplicationViewer, // Middleware checks if user is related (worker or client owner)
    getApplicationDetails
);

// PATCH /applications/:applicationId - Update application status (Client accepts/rejects)
router.patch(
    "/:applicationId",
    ensureClient, // Assuming client updates status initially
    validateRequest({ body: updateApplicationStatusSchema }),
    updateApplicationStatus // Requires client to own the JOB associated
);

// DELETE /applications/:applicationId - Withdraw application (Worker only)
router.delete(
    "/:applicationId",
    ensureWorker,
    ensureWorkerOwnsApplication, // Middleware checks if worker submitted this app
    withdrawApplication
);


export default router;