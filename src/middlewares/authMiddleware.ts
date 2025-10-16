import { Request, Response, NextFunction } from "express";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ message: "Access denied. Please login first." });
  }

  next();
};
