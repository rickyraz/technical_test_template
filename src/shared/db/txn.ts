import type postgres from "postgres";
import { DatabaseError } from "../errors/AppErrors";
import { Effect } from "effect";

//  transaction function typically state-less.
export const withTransaction = <R, E = never, Env extends never = never>(
    sql: postgres.Sql,
    fn: (trx: postgres.TransactionSql) => Effect.Effect<R, E, Env>
): Effect.Effect<R, E | DatabaseError, Env> => {
    return Effect.tryPromise({
        try: () =>
            sql.begin(async (trx) => {
                return Effect.runPromise(fn(trx));
            }) as Promise<R>,
        catch: (e) =>
            new DatabaseError({
                message: "Transaction failed",
                cause: e,
            }),
    });
};

// sql.begin() callback gets TransactionSql, runs it, auto - commits / rollbacks
// Effect.runPromise() safely converts Effect → Promise
// as Promise < R > tells TypeScript callback returns correct type
// Env extends never enforces no hidden dependencies
// E | DatabaseError catches both Effect errors + db errors