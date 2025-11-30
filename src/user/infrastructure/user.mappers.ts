import { Effect, Schema } from 'effect';
import { BaseUser, FullUser, UserWithPassword } from '../domain/user.schema';
import { RoleName } from '../../auth/domain/role.schema';
import type { UserRow } from './user.table';
import { DatabaseError } from '../../shared/errors/AppErrors';

/**
 * Mapper Layer (Anti-Corruption Layer)
 *
 * Purpose: Transform between Database representation and Domain model
 *
 * Database Row (Infrastructure) → Domain Model (Business Logic)
 * Domain Model (Business Logic) → Database Row (Infrastructure)
 *
 * This ensures Domain remains pure and independent from database structure.
 */

export class UserMapper {
    /**
     * Map database row to BaseUser domain model
     * Used when requestingRole is 'user' (limited view)
     */
    static toBaseUser(row: UserRow): Effect.Effect<BaseUser, DatabaseError> {
        return Effect.gen(function* (_) {
            const decoded = yield* _(
                Schema.decodeUnknown(BaseUser)({
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    role: row.role,
                    isActive: row.isActive,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                }),
                Effect.mapError(
                    (error) =>
                        new DatabaseError({
                            message: 'Failed to map database row to BaseUser domain model',
                            cause: error,
                        })
                )
            );

            return decoded;
        });
    }

    /**
     * Map database row to FullUser domain model
     * Used when requestingRole is 'admin' (full view with sensitive data)
     */
    static toFullUser(row: UserRow): Effect.Effect<FullUser, DatabaseError> {
        return Effect.gen(function* (_) {
            const decoded = yield* _(
                Schema.decodeUnknown(FullUser)({
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    role: row.role,
                    isActive: row.isActive,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    // Sensitive fields
                    salary: row.salary ? parseFloat(row.salary) : null,
                    ssn: row.ssn,
                }),
                Effect.mapError(
                    (error) =>
                        new DatabaseError({
                            message: 'Failed to map database row to FullUser domain model',
                            cause: error,
                        })
                )
            );

            return decoded;
        });
    }

    /**
     * Map database row to UserWithPassword domain model
     * Used for authentication purposes only (never exposed via API)
     */
    static toUserWithPassword(row: UserRow): Effect.Effect<UserWithPassword, DatabaseError> {
        return Effect.gen(function* (_) {
            const decoded = yield* _(
                Schema.decodeUnknown(UserWithPassword)({
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    role: row.role,
                    isActive: row.isActive,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    // Sensitive fields
                    salary: row.salary ? parseFloat(row.salary) : null,
                    ssn: row.ssn,
                    // Password (hashed)
                    password: row.password,
                }),
                Effect.mapError(
                    (error) =>
                        new DatabaseError({
                            message: 'Failed to map database row to UserWithPassword domain model',
                            cause: error,
                        })
                )
            );

            return decoded;
        });
    }

    /**
     * Map based on requesting role
     * This implements the authorization view logic
     */
    static toUserByRole<R extends RoleName>(
        row: UserRow,
        requestingRole: R
    ): Effect.Effect<R extends 'admin' ? FullUser : BaseUser, DatabaseError> {
        if (requestingRole === 'admin') {
            return UserMapper.toFullUser(row) as any;
        } else {
            return UserMapper.toBaseUser(row) as any;
        }
    }

    /**
     * Map array of rows based on requesting role
     */
    static toUsersByRole<R extends RoleName>(
        rows: UserRow[],
        requestingRole: R
    ): Effect.Effect<ReadonlyArray<R extends 'admin' ? FullUser : BaseUser>, DatabaseError> {
        return Effect.gen(function* (_) {
            const users = yield* _(
                Effect.all(
                    rows.map((row) => UserMapper.toUserByRole(row, requestingRole))
                )
            );

            return users as any;
        });
    }
}
