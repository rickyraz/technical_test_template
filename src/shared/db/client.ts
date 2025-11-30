import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Config, Effect, Layer } from "effect";
import * as schema from '../../user/infrastructure/UserTable';

export interface PostgresConfig {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly user: string;
    readonly password: string;
}

export class DatabaseClient extends Effect.Tag("DatabaseClient")
    <DatabaseClient,
        {
            readonly sql: postgres.Sql;
            readonly db: ReturnType<typeof drizzle<typeof schema>>;
        }
    >() { }


const makePostgresClient = (config: PostgresConfig): postgres.Sql => {
    return postgres({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: 20,
        idle_timeout: 30,
        connect_timeout: 2,
        prepare: true,
    });
};

export const DatabaseClientLive = Layer.scoped(
    DatabaseClient,
    Effect.gen(function* (_) {
        const config = yield* _(
            Effect.all({
                host: Config.string('DB_HOST').pipe(Config.withDefault('localhost')),
                port: Config.number('DB_PORT').pipe(Config.withDefault(5432)),
                database: Config.string('DB_NAME'),
                user: Config.string('DB_USER'),
                password: Config.string('DB_PASSWORD'),
            })
        );

        const sql = makePostgresClient(config);
        const db = drizzle(sql, { schema });

        yield* _(
            Effect.addFinalizer(() =>
                Effect.sync(() => {
                    sql.end();
                })
            )
        );

        return {
            sql,
            db,
        };
    })
);
