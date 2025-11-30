import { Context, Effect, Option, Layer } from 'effect';
import { UserRepository } from '../infrastructure/user.repository';
import {
    UnauthorizedError,
    ForbiddenError,
} from '../../shared/errors/application.errors';
import { NotFoundError } from '../../shared/errors/domain.errors';

import { DatabaseError } from '../../shared/errors/infrastructure.errors';
import {
    type UserByRole,
    UpdateUserProfile,
    UpdateSensitiveData,
} from '../domain/user.schema';
import { RoleName } from '../../auth/domain/role.schema';

export class UserService extends Context.Tag('UserService')
    <UserService,
        {
            readonly getUser: <R extends RoleName>(
                userId: string,
                requestingRole: R,
                requestingUserId: string
            ) => Effect.Effect<
                UserByRole<R>,
                NotFoundError | UnauthorizedError | ForbiddenError | DatabaseError
            >;

            readonly getAllUsers: <R extends RoleName>(
                requestingRole: R,
                requestingUserId: string
            ) => Effect.Effect<ReadonlyArray<UserByRole<R>>, UnauthorizedError | DatabaseError>;

            readonly updateProfile: (
                userId: string,
                data: UpdateUserProfile,
                requestingRole: RoleName,
                requestingUserId: string
            ) => Effect.Effect<boolean, ForbiddenError | DatabaseError>,

            readonly updateSensitiveData: (
                userId: string,
                data: UpdateSensitiveData,
                requestingRole: RoleName,
                requestingUserId: string
            ) => Effect.Effect<boolean, ForbiddenError | DatabaseError>;
        }
    >() { }

export const UserServiceLive = Layer.effect(
    UserService,
    Effect.gen(function* (_) {
        const repo = yield* _(UserRepository);

        const getUser = <R extends RoleName>(
            userId: string,
            requestingRole: R,
            requestingUserId: string
        ) =>
            Effect.gen(function* (_) {
                // Validate: users can only view their own profile
                if (requestingRole === 'user' && requestingUserId !== userId) {
                    return yield* _(
                        Effect.fail(
                            new ForbiddenError({
                                message: 'Users can only view their own profile',
                            })
                        )
                    );
                }

                const userOption = yield* _(
                    repo.findById(userId, requestingRole)
                );

                return yield* _(
                    Option.match(userOption, {
                        onNone: () =>
                            Effect.fail(
                                new NotFoundError({ entity: 'User', id: userId })
                            ),
                        onSome: (user) => Effect.succeed(user),
                    })
                );
            });

        const getAllUsers = <R extends RoleName>(
            requestingRole: R,
            requestingUserId: string
        ) =>
            repo.findAll(requestingRole);

        const updateProfile = (
            userId: string,
            data: UpdateUserProfile,
            requestingRole: RoleName,
            requestingUserId: string
        ) =>
            Effect.gen(function* (_) {
                // Validate: users can only update their own profile
                if (requestingRole === 'user' && requestingUserId !== userId) {
                    return yield* _(
                        Effect.fail(
                            new ForbiddenError({
                                message: 'Cannot update other users',
                            })
                        )
                    );
                }

                return yield* _(
                    repo.update(userId, data)
                );
            });

        const updateSensitiveData = (
            userId: string,
            data: UpdateSensitiveData,
            requestingRole: RoleName,
            requestingUserId: string
        ) =>
            Effect.gen(function* (_) {
                // Only admin can update sensitive data
                if (requestingRole !== 'admin') {
                    return yield* _(
                        Effect.fail(
                            new ForbiddenError({
                                message: 'Admin access required',
                            })
                        )
                    );
                }

                return yield* _(repo.updateSensitive(userId, data));
            });

        return {
            getUser,
            getAllUsers,
            updateProfile,
            updateSensitiveData,
        };
    })
);