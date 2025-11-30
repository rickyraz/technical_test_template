import { Context, Effect, Option, Layer } from 'effect';
import { eq } from 'drizzle-orm';
import { DatabaseConnection } from '../../shared/db/connection';
import { usersTable } from './user.table';
import { DatabaseError } from '../../shared/errors/AppErrors';
import {
    BaseUser,
    FullUser,
    UserWithPassword,
    type UserByRole,
    UpdateUserProfile,
    UpdateSensitiveData,
} from '../domain/user.schema';
import { RoleName } from '../../auth/domain/role.schema';
import { UserMapper } from './user.mappers';

/**
 * UserRepository - Infrastructure Layer
 *
 * Responsibility:
 * - Data access and persistence
 * - Query database using Drizzle ORM
 * - Transform database rows to Domain models using UserMapper
 * - Return Domain models (NOT database rows)
 *
 * This follows Repository pattern from DDD:
 * - Repository returns Domain entities
 * - Database details are hidden from domain layer
 */

export class UserRepository extends Context.Tag('UserRepository')
    <UserRepository,
        {
            /**
             * Find user by ID, returns view based on requesting role
             * admin → FullUser (with sensitive data)
             * user → BaseUser (without sensitive data)
             */
            readonly findById: <R extends RoleName>(
                userId: string,
                requestingRole: R
            ) => Effect.Effect<Option.Option<UserByRole<R>>, DatabaseError>;

            /**
             * Find all active users, returns view based on requesting role
             */
            readonly findAll: <R extends RoleName>(
                requestingRole: R
            ) => Effect.Effect<ReadonlyArray<UserByRole<R>>, DatabaseError>;

            /**
             * Find user by email (for authentication)
             * Returns UserWithPassword (includes password hash)
             */
            readonly findByEmail: (
                email: string
            ) => Effect.Effect<Option.Option<UserWithPassword>, DatabaseError>;

            /**
             * Update user profile (name, email)
             */
            readonly update: (
                userId: string,
                data: UpdateUserProfile
            ) => Effect.Effect<boolean, DatabaseError>;

            /**
             * Update sensitive data (salary, SSN) - admin only
             */
            readonly updateSensitive: (
                userId: string,
                data: UpdateSensitiveData
            ) => Effect.Effect<boolean, DatabaseError>;
        }
    >() { }


export const UserRepositoryLive = Layer.effect(
    UserRepository,
    Effect.gen(function* (_) {
        const connection = yield* _(DatabaseConnection);
        const db = connection.db;

        const findById = <R extends RoleName>(userId: string, requestingRole: R) =>
            Effect.gen(function* (_) {
                // Query database
                const rows = yield* _(
                    Effect.tryPromise({
                        try: () => db.select().from(usersTable).where(eq(usersTable.id, userId)),
                        catch: (error) =>
                            new DatabaseError({
                                message: 'Failed to fetch user from database',
                                cause: error,
                            }),
                    })
                );

                if (rows.length === 0) {
                    return Option.none();
                }

                const row = rows[0];
                if (!row) {
                    return Option.none();
                }

                // Map database row to Domain model based on role
                const user = yield* _(
                    UserMapper.toUserByRole(row, requestingRole)
                );

                return Option.some(user as UserByRole<R>);
            });

        const findAll = <R extends RoleName>(requestingRole: R) =>
            Effect.gen(function* (_) {
                // Query database
                const rows = yield* _(
                    Effect.tryPromise({
                        try: () => db.select().from(usersTable).where(eq(usersTable.isActive, true)),
                        catch: (error) =>
                            new DatabaseError({
                                message: 'Failed to fetch users from database',
                                cause: error,
                            }),
                    })
                );

                // Map all rows to Domain models based on role
                const users = yield* _(
                    UserMapper.toUsersByRole(rows, requestingRole)
                );

                return users as ReadonlyArray<UserByRole<R>>;
            });

        const findByEmail = (email: string) =>
            Effect.gen(function* (_) {
                // Query database
                const rows = yield* _(
                    Effect.tryPromise({
                        try: () => db.select().from(usersTable).where(eq(usersTable.email, email)),
                        catch: (error) =>
                            new DatabaseError({
                                message: 'Failed to fetch user by email from database',
                                cause: error,
                            }),
                    })
                );

                if (rows.length === 0) {
                    return Option.none();
                }

                const row = rows[0];
                if (!row) {
                    return Option.none();
                }

                // Map to UserWithPassword (for authentication)
                const user = yield* _(
                    UserMapper.toUserWithPassword(row)
                );

                return Option.some(user);
            });

        const update = (userId: string, data: UpdateUserProfile) =>
            Effect.gen(function* (_) {
                const updates: Partial<typeof usersTable.$inferInsert> = {};

                // Apply domain validation through UpdateUserProfile schema
                if (data.name) updates.name = data.name;
                if (data.email) updates.email = data.email;

                if (Object.keys(updates).length === 0) {
                    return false;
                }

                updates.updatedAt = new Date();

                // Execute database update
                const result = yield* _(
                    Effect.tryPromise({
                        try: () =>
                            db
                                .update(usersTable)
                                .set(updates)
                                .where(eq(usersTable.id, userId)),
                        catch: (error) =>
                            new DatabaseError({
                                message: 'Failed to update user in database',
                                cause: error,
                            }),
                    })
                );

                return result.length > 0;
            });

        const updateSensitive = (userId: string, data: UpdateSensitiveData) =>
            Effect.gen(function* (_) {
                const updates: Partial<typeof usersTable.$inferInsert> = {};

                // Apply domain validation through UpdateSensitiveData schema
                if (data.salary !== undefined) {
                    updates.salary = data.salary !== null ? data.salary.toString() : null;
                }
                if (data.ssn !== undefined) {
                    updates.ssn = data.ssn;
                }

                if (Object.keys(updates).length === 0) {
                    return false;
                }

                updates.updatedAt = new Date();

                // Execute database update
                const result = yield* _(
                    Effect.tryPromise({
                        try: () =>
                            db
                                .update(usersTable)
                                .set(updates)
                                .where(eq(usersTable.id, userId)),
                        catch: (error) =>
                            new DatabaseError({
                                message: 'Failed to update sensitive data in database',
                                cause: error,
                            }),
                    })
                );

                return result.length > 0;
            });

        return {
            findById,
            findAll,
            findByEmail,
            update,
            updateSensitive,
        };
    })
);
