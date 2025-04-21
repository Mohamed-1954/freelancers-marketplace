import { Router } from "express";
import { signOut, refreshToken, signIn, signUp } from "./handlers";

const router = Router();

router.post("/sign-up", signUp);

router.post("/sign-in", signIn);

router.post("/refresh-token", refreshToken);

router.post("/sign-out", signOut);

export default router;