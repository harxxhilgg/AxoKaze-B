import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwtService";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({
      message: "Access denied. Please login first.",
      authError: "NO_TOKEN",
    });
  }

  const decoded = verifyAccessToken(accessToken);

  if (!decoded) {
    return res.status(401).json({
      message: "Invalid or expired token.",
      authError: "INVALID_TOKEN",
    });
  }

  // ATTACH USER TO REQ
  (req as any).user = decoded;

  next();
};
