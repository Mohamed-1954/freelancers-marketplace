import { Router } from "express";
import { getMyStats } from "./handlers";
import { ensureWorker } from "../users/middlewares";

const router = Router();

// GET /statistics/me - Get statistics for the logged-in worker
router.get("/me", ensureWorker, getMyStats);

// Additional statistics routes can be added here
// For example:
// - GET /statistics/top-workers - Get top workers by completion rate
// - GET /statistics/top-clients - Get top clients by job postings

export default router;