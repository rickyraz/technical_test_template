import { Schema } from "effect";

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
    "UnauthorizedError",
    { message: Schema.String }
) { }

export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
    "ForbiddenError",
    { message: Schema.String }
) { }

export class ValidationError extends Schema.TaggedError<ValidationError>()(
    "ValidationError",
    {
        message: Schema.String,
        errors: Schema.optional(Schema.Unknown)
    }
) { }
