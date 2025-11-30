import { Context, Effect, Layer } from 'effect';
import { DatabaseClient } from './client';
import { RoleName } from '../../auth/domain/role.schema';
import type { drizzle } from 'drizzle-orm/postgres-js';
import type * as schema from '../../user/infrastructure/user.table';

export interface SessionContext {
    readonly userId: string | null;
    readonly role: RoleName;
}

export class SessionContextTag extends Context.Tag('SessionContextTag')
    <SessionContextTag,
        SessionContext
    >() { }

export class DatabaseConnection extends Context.Tag('DatabaseConnection')
    <DatabaseConnection,
        {
            readonly db: ReturnType<typeof drizzle<typeof schema>>;
        }
    >() { }

export const DatabaseConnectionLive = Layer.effect(
    DatabaseConnection,
    Effect.gen(function* (_) {
        const client = yield* _(DatabaseClient);

        return { db: client.db };
    })
);

