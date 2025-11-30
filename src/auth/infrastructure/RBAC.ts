import { Effect } from "effect";
import { DatabaseConnection, SessionContextTag } from "../../shared/db/connection";
import type { RoleName } from "../domain/role.schema";
import { DatabaseError } from "../../shared/errors/infrastructure.errors";

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