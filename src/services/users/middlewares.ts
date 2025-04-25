import type { Request, Response, NextFunction } from "express";

// Checks if the logged-in user is a participant of the conversation (for HTTP routes)
export const ensureWorker = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType !== "Worker") {
    res.status(403).json({ message: "Forbidden: Requires worker role." });
    return;
  }
  next();
};

export const ensureClient = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType !== "Client") {
    res.status(403).json({ message: "Forbidden: Requires client role." });
    return;
  }
  next(); // Add the missing next() call
};