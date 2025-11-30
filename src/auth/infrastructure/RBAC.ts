import { Effect } from "effect";
import { DatabaseConnection, SessionContextTag } from "../../shared/db/connection";
import { DatabaseError } from "../../shared/errors/AppErrors";
import type { RoleName } from "../domain/Role";

export const requireRole = <Allowed extends RoleName[]>(...roles: Allowed) =>
    Effect.flatMap(DatabaseConnection, (db) =>
        Effect.gen(function* (_) {
            const session = yield* _(SessionContextTag); // tag

            if (!roles.includes(session.role)) {
                return yield* _(
                    Effect.fail(
                        new DatabaseError({
                            message: "Forbidden: insufficient role",
                        })
                    )
                );
            }
        })
    );