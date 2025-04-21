import type { Request, Response } from "express";
import type { SignInRequest, SignUpRequest } from "./request-types";
import { signInSchema, signUpSchema } from "./validations";
import bcrypt from "bcrypt";
import db from "@/db";
import { users } from "@/db/schemas";
import { eq, sql } from "drizzle-orm";
import { signJwt, verifyJwt } from "./utils/jwt";
import config from "@/config/config";

export const signUp = async (req: SignUpRequest, res: Response) => {
  try {
    const validatedData = signUpSchema.safeParse(req.body);
    if (validatedData.error) {
      res.status(400).json({ message: "Error validating request body" });
      return;
    }

    const { email, password, username, userType } = validatedData.data;

    const duplicateUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (duplicateUser) {
      res.status(400).json({
        message: "Email already exists, please use a different email or login.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const insertedUser = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        username: username,
        userType: userType
      })
      .returning({ userId: users.userId });

    if (!insertedUser[0]) {
      res.status(400).json({
        message: "An error occurred while creating your account.",
      });
      return;
    }

    res.status(201).json({ message: "Registration request submitted" });
  } catch (e) {
    console.error("An error occured inside the sign up handler", e);
  }
};

export const signIn = async (req: SignInRequest, res: Response) => {
  try {
    const cookies = req.cookies;
    const { error, data: validatedData } = signInSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ message: "Error validating request body" });
      return;
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (!existingUser) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const passwordMatch = await bcrypt.compare(
      validatedData.password,
      existingUser.password
    );
    if (!passwordMatch) {
      res.status(401).json({ message: "Wrong credentials" });
      return;
    }

    const payload = {
      userId: existingUser.userId,
      email: existingUser.email,
      username: existingUser.username,
      userType: existingUser.userType,
    };

    const accessToken = await signJwt({
      user: payload,
      secret: config.jwt.accessTokenSecret,
      expiresAt: "10mins",
    });

    const newRefreshToken = await signJwt({
      user: payload,
      secret: config.jwt.refreshTokenSecret,
      expiresAt: "7d",
    });

    let refreshTokenArray = existingUser.refreshToken || [];

    if (cookies?.jwt) {
      const refreshToken = cookies.jwt;

      const tokenExists = refreshTokenArray.includes(refreshToken);

      if (!tokenExists) {
        refreshTokenArray = [];
      } else {
        refreshTokenArray = refreshTokenArray.filter(
          (rt) => rt !== refreshToken
        );
      }

      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      });
    }

    refreshTokenArray.push(newRefreshToken);

    await db
      .update(users)
      .set({ refreshToken: refreshTokenArray })
      .where(eq(users.userId, existingUser.userId));

    res.cookie("jwt", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login Successful",
      accessToken,
    });
  } catch (e) {
    console.error("An error occured inside the sign in handler", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;
    console.log("cookies", cookies);
    if (!cookies?.jwt) {
      res
        .status(401)
        .json({ message: "Unauthorized: No refresh token provided." });
      return;
    }

    const refreshToken = cookies.jwt;

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    const decodedToken = await verifyJwt({
      token: refreshToken,
      secret: config.jwt.refreshTokenSecret,
    });

    if (!decodedToken) {
      res
        .status(403)
        .json({ message: "Forbidden: Invalid or expired refresh token." });
      return;
    }

    const foundUser = await db.query.users.findFirst({
      where: eq(users.userId, decodedToken.userId),
    });

    if (!foundUser) {
      res.status(403).json({ message: "Forbidden: User not found." });
      return;
    }

    const tokenIndex = foundUser.refreshToken.indexOf(refreshToken);
    if (tokenIndex === -1) {
      res
        .status(403)
        .json({ message: "Forbidden: Refresh token not recognized." });
      return;
    }

    const newRefreshTokenArray = foundUser.refreshToken.filter(
      (token) => token !== refreshToken
    );

    const payload = {
      userId: foundUser.userId,
      email: foundUser.email,
      username: foundUser.username,
      userType: foundUser.userType,
    };

    const accessToken = await signJwt({
      user: payload,
      secret: config.jwt.accessTokenSecret,
      expiresAt: "10mins",
    });

    const newRefreshToken = await signJwt({
      user: payload,
      secret: config.jwt.refreshTokenSecret,
      expiresAt: "1d",
    });

    newRefreshTokenArray.push(newRefreshToken);

    // Limit the number of stored refresh tokens
    const MAX_REFRESH_TOKENS = 5;
    if (newRefreshTokenArray.length > MAX_REFRESH_TOKENS) {
      newRefreshTokenArray.shift();
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ refreshToken: newRefreshTokenArray })
        .where(eq(users.userId, foundUser.userId));
    });

    res.cookie("jwt", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const signOut = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      res.status(200).json({ message: "Already logged out" });
      return;
    }

    const refreshToken = cookies.jwt;

    const foundUser = await db.query.users.findFirst({
      where: sql`${refreshToken} = ANY(${users.refreshToken})`,
    });

    if (!foundUser) {
      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      });
      res.status(200).json({ message: "Logged out successfully" });
      return;
    }

    // Remove the refresh token from the array
    const updatedRefreshTokens = foundUser.refreshToken.filter(
      (rt) => rt !== refreshToken
    );

    // Update user in database
    await db
      .update(users)
      .set({ refreshToken: updatedRefreshTokens })
      .where(eq(users.userId, foundUser.userId));

    // Clear the cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res
      .status(500)
      .json({ message: "Internal server error during logout" });
  }
};
