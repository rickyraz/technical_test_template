// errors/AppErrors.ts

import { Data, Schema } from 'effect';

// error yang tipenya aman (type-safe) dan bisa dikenali lewat tag unik

// >> Tagged Union / Algebraic Data Types(ADT)
// Data.TaggedError secara konseptual mirip dengan “ADT error” di Haskell / Scala / ZIO:
// Kita punya beberapa jenis error berbeda, masing - masing dengan data unik.
// Bisa diperlakukan sebagai union type secara type-safe.

// >> Historis / Evolusi konsep:
// Di JavaScript / TypeScript klasik: error itu object dengan message, kadang dikasih property tambahan secara manual.
// Di OOP: biasanya subclassing Error(class NotFoundError extends Error { ... }) tapi TypeScript tidak bisa enforce shape secara aman, kadang payload hilang.
// Di FP modern(ZIO → Effect - TS): semua error harus didefinisikan eksplisit, sehingga:
// Bisa dimatch dengan effect.match atau effect.tryCatch.
// Bisa diproses dalam Effect pipeline tanpa throw/catch klasik.
// Jadi, Data adalah namespace untuk semua struktur data tagged di effect - ts, termasuk error, ADT, dsb.

// export class DatabaseError extends Data.TaggedError('DatabaseError')<{
//     readonly message: string;
//     readonly cause?: unknown;
// }> { }

// export class NotFoundError extends Data.TaggedError('NotFoundError')<{
//     readonly entity: string;
//     readonly id: string;
// }> { }

// export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
//     readonly message: string;
// }> { }

// export class ForbiddenError extends Data.TaggedError('ForbiddenError')<{
//     readonly message: string;
// }> { }

// export class ValidationError extends Data.TaggedError('ValidationError')<{
//     readonly message: string;
//     readonly errors?: unknown;
// }> { }

// // Define error schemas
// const NotFoundErrorSchema = Schema.Struct({
//     _tag: Schema.Literal('NotFoundError'),
//     entity: Schema.String,
//     id: Schema.String,
// });

// const ForbiddenErrorSchema = Schema.Struct({
//     _tag: Schema.Literal('ForbiddenError'),
//     message: Schema.String,
// });

// const UnauthorizedErrorSchema = Schema.Struct({
//     _tag: Schema.Literal('UnauthorizedError'),
//     message: Schema.String,
// });

// const DatabaseErrorSchema = Schema.Struct({
//     _tag: Schema.Literal('DatabaseError'),
//     message: Schema.String,
// });

// ---------------------------------------------
// 2. Auto-generate schema untuk setiap ADT
// ---------------------------------------------
// export const NotFoundErrorSchema = Schema.TaggedClass(NotFoundError);
// export const ForbiddenErrorSchema = Schema.TaggedClass(ForbiddenError);
// export const UnauthorizedErrorSchema = Schema.TaggedClass(UnauthorizedError);
// export const DatabaseErrorSchema = Schema.TaggedClass(DatabaseError);
// export const ValidationErrorSchema = Schema.TaggedClass(ValidationError);

// Used when you need simple error discrimination without validation complexity
// class TestError extends Data.TaggedError("TestError")<{}> {}



export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
    "DatabaseError",
    {
        message: Schema.String,
        cause: Schema.optional(Schema.Unknown)
    }
) { }

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
    "NotFoundError",
    {
        entity: Schema.String,
        id: Schema.String
    }
) { }

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
    "UnauthorizedError",
    {
        message: Schema.String
    }
) { }

export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
    "ForbiddenError",
    {
        message: Schema.String
    }
) { }

export class ValidationError extends Schema.TaggedError<ValidationError>()(
    "ValidationError",
    {
        message: Schema.String,
        errors: Schema.optional(Schema.Unknown)
    }
) { }

// optional union
export const AppErrorSchema = Schema.Union(
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
    DatabaseError,
    ValidationError
);
