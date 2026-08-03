/**
 * Data-access layer error hierarchy. The layer is the single enforcement
 * point, so every denial/short-circuit is represented by an explicit error
 * type carrying a stable machine-readable `code`. Server-action boundaries
 * (Task 0103) and UI can map these to user-facing messages without reaching
 * into the DB.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

/** The requested resource does not exist (or is not visible to the actor). */
export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, "NOT_FOUND");
  }
}

/** The actor signed in but is not permitted to perform this operation. */
export class ForbiddenError extends AppError {
  constructor(message = "You are not allowed to do that.") {
    super(message, "FORBIDDEN");
  }
}

/** No (or expired) session — the actor is not authenticated. */
export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in.") {
    super(message, "UNAUTHORIZED");
  }
}

/** Server-side input validation failed. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION");
  }
}

/** The operation conflicts with existing state (duplicate, invalid transition). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}
