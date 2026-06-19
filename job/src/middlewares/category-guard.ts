import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../common";

// Recruiters may only post/edit jobs in industries assigned to them by Admin.
// Super admins bypass this check entirely.
export const categoryGuard = (req: Request, res: Response, next: NextFunction) => {
  if (req.currentUser!.role === "super_admin") return next();

  const industryId = Number(req.body.industryId);
  const assigned = req.currentUser!.assignedCategories ?? [];

  if (!assigned.includes(industryId)) {
    throw new ForbiddenError("You are not authorized to post jobs in this category");
  }

  next();
};