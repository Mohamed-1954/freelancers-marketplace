import { Router } from "express";
import {
  getMyProfile,
  updateMyProfile,
  findNearbyWorkers,
  findSuggestedWorkers,
  deleteMyProfile,
} from "./handlers";
// Correct path for authentication middleware
import { ensureAuthenticated } from "../auth/middlewares";
import { ensureWorker } from "./middlewares"; // Keep ensureWorker if needed elsewhere, otherwise remove
import { validateRequest } from "@/common/middlewares";
import { updateUserSchema } from "./validations";

const router = Router();

router.get("/me", ensureAuthenticated, getMyProfile);

router.put(
  "/me",
  ensureAuthenticated,
  validateRequest({ body: updateUserSchema }),
  updateMyProfile
);

router.get("/workers/nearby", ensureAuthenticated, findNearbyWorkers);

router.get("/workers/suggested", ensureAuthenticated, findSuggestedWorkers);

// DELETE /users/me - Delete the authenticated user's profile
router.delete(
  "/me",
  ensureAuthenticated, // Ensure user is logged in
  deleteMyProfile      // Call the handler
);

export default router;