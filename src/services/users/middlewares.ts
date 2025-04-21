import type { Request, Response, NextFunction } from "express";

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
  next();
};