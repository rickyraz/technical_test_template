import { Schema } from "effect";

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
    "NotFoundError",
    {
        entity: Schema.String,
        id: Schema.String
    }
) { }
