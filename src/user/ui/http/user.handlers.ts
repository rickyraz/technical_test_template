import { Effect } from 'effect';
import { HttpApiBuilder } from '@effect/platform';
import { UserApi } from './user.api';
import { UserService } from '../../application/user.service';
import { AuthContextService } from '../../../auth/domain/auth.context';
import { withAuth } from '../../../shared/middleware/auth.middleware';

// Handlers = implementation → memanggil use-case

export const UserHandlersLive = HttpApiBuilder.group(
    UserApi,
    'Users',
    (handlers) =>
        Effect.gen(function* (_) {
            const userService = yield* _(UserService);

            return handlers
                .handle('getCurrentUser', () =>
                    withAuth(
                        Effect.gen(function* (_) {
                            const authContext = yield* _(AuthContextService);
                            return yield* _(
                                userService.getUser(
                                    authContext.userId,
                                    authContext.role,
                                    authContext.userId
                                )
                            );
                        })
                    )
                )
                .handle('getAllUsers', () =>
                    withAuth(
                        Effect.gen(function* (_) {
                            const authContext = yield* _(AuthContextService);
                            return yield* _(
                                userService.getAllUsers(authContext.role, authContext.userId)
                            );
                        })
                    )
                )
                .handle('getUser', ({ path }) =>
                    withAuth(
                        Effect.gen(function* (_) {
                            const authContext = yield* _(AuthContextService);
                            return yield* _(
                                userService.getUser(path.id, authContext.role, authContext.userId)
                            );
                        })
                    )
                )
                .handle('updateUser', ({ path, payload }) =>
                    withAuth(
                        Effect.gen(function* (_) {
                            const authContext = yield* _(AuthContextService);
                            return yield* _(
                                userService.updateProfile(
                                    path.id,
                                    payload,
                                    authContext.role,
                                    authContext.userId
                                )
                            );
                        })
                    )
                )
                .handle('updateSensitiveData', ({ path, payload }) =>
                    withAuth(
                        Effect.gen(function* (_) {
                            const authContext = yield* _(AuthContextService);
                            return yield* _(
                                userService.updateSensitiveData(
                                    path.id,
                                    payload,
                                    authContext.role,
                                    authContext.userId
                                )
                            );
                        })
                    )
                );
        })
);