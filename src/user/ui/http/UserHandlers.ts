import { Effect } from 'effect';
import { HttpApiBuilder } from '@effect/platform';
import { UserApi } from './UserApi';
import { UserService } from '../../application/UserService';
import { AuthContextService } from '../../../auth/domain/AuthContext';
import { withAuth } from '../../../shared/middleware/AuthMiddleware';

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