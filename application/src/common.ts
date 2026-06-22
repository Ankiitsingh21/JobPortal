import { Request, Response, NextFunction } from "express";
import { ValidationError, validationResult } from "express-validator";
import jwt from "jsonwebtoken";

export abstract class CustomError extends Error {
  abstract statusCode: number;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
  abstract serializeErrors(): { message: string; field?: string }[];
}

export class BadRequestError extends CustomError {
  statusCode = 400;
  constructor(message: string) { super(message); }
  serializeErrors() { return [{ message: this.message }]; }
}

export class NotFoundError extends CustomError {
  statusCode = 404;
  constructor(message = "Not found") { super(message); }
  serializeErrors() { return [{ message: this.message }]; }
}

export class NotAuthorizedError extends CustomError {
  statusCode = 401;
  constructor() { super("Not authorized"); }
  serializeErrors() { return [{ message: this.message }]; }
}

export class ForbiddenError extends CustomError {
  statusCode = 403;
  constructor(message = "Forbidden") { super(message); }
  serializeErrors() { return [{ message: this.message }]; }
}

export class RequestValidationError extends CustomError {
  statusCode = 400;
  constructor(private errors: ValidationError[]) { super("Invalid request parameters"); }
  serializeErrors() {
    return this.errors.map((err: any) => ({ message: err.msg, field: err.path }));
  }
}

export interface UserPayload {
  id: string;
  role: "super_admin" | "recruiter" | "worker";
  assignedCategories?: number[];
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.session?.jwt;
  if (!token) throw new NotAuthorizedError();
  try {
    req.currentUser = jwt.verify(token, process.env.JWT_KEY!) as UserPayload;
  } catch {
    throw new NotAuthorizedError();
  }
  next();
};

export const requireRole = (...roles: UserPayload["role"][]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      throw new ForbiddenError(`Only ${roles.join(" or ")} can perform this action`);
    }
    next();
  };
};

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new RequestValidationError(errors.array());
  next();
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.serializeErrors(),
    });
  }
  console.error(err);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    errors: [{ message: "Something went wrong" }],
  });
};