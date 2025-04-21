import { Router } from "express";
import {
  getMyProfile,
  updateMyProfile,
  findNearbyWorkers,
  findSuggestedWorkers,
} from "./handlers";
import { ensureWorker}  from "./middlewares";
import { validateRequest } from "@/common/middlewares";
import { updateUserSchema } from "./validations";

const router = Router();

router.get("/me", getMyProfile);

router.put(
  "/me",
  validateRequest({ body: updateUserSchema }), // Validate update payload
  ensureWorker, // Example: Only workers can update specific profile fields like bio/skills
  updateMyProfile
);

router.get("/workers/nearby", findNearbyWorkers);

router.get("/workers/suggested", findSuggestedWorkers);

export default router;