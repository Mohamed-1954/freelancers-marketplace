import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./utils/jwt";
import config from "@/config/config";
import { requestUserSchema } from "./validations";

export interface RequestUser {
  user: {
    userId: string;
    email: string;
    username: string;
    userType: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user: RequestUser["user"];
    }
  }
}

export const ensureToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ message: "Authorization header missing or invalid" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyJwt({
      token: token,
      secret: config.jwt.accessTokenSecret,
    });
    if (!decoded) {
      res.status(403).json({ message: "Invalid or expired token" });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = requestUserSchema.safeParse(req.user);
  if (error) {
    res.status(401).json({ message: "Unauthorized: User not authenticated" });
    return;
  }
  next();
};


