import { Router } from "express";
import * as handlers from "./handlers";
import { ensureWorker } from "../users/middlewares"; 

const router = Router();

router.get("/me", ensureWorker, handlers.getMyStats);

export default router;