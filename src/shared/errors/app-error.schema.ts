import { Schema } from "effect";
import { DatabaseError } from "./infrastructure.errors";
import { UnauthorizedError, ForbiddenError, ValidationError } from "./application.errors";
import { NotFoundError } from "./domain.errors";

export const AppErrorSchema = Schema.Union(
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
    DatabaseError,
    ValidationError
);
