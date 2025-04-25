import { Router } from "express";
import { signIn, signUp, refreshToken, signOut } from "./handlers"; // Added handleRefreshToken, logout
import { validateRequest } from "@/common/middlewares";
import { signInSchema, signUpSchema } from "./validations";

const router = Router();

// POST /auth/signup - Register a new user
router.post("/signup", validateRequest({ body: signUpSchema }), signUp);

// POST /auth/signin - Log in a user
router.post("/signin", validateRequest({ body: signInSchema }), signIn);

// GET /auth/refresh - Get a new access token using refresh token (from cookie)
router.get("/refresh", refreshToken); // Added refresh route

// POST /auth/signout - Log out a user (clear refresh token cookie and potentially DB entry)
router.post("/signOut", signOut); // Added logout route

export default router;