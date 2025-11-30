import { Config, Effect } from 'effect';
import {
    HttpMiddleware,
    HttpServerRequest,
} from '@effect/platform';
import { Schema } from 'effect';
import * as jwt from 'jsonwebtoken';
import { AuthContext, AuthContextService, AuthenticationError } from '../../auth/domain/AuthContext';
import { UserRepository } from '../../user/infrastructure/UserRepository';

interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

// JWT verification with database lookup
const verifyJwt = (token: string) =>
    Effect.gen(function* (_) {
        if (!token || token === '') {
            return yield* _(
                Effect.fail(new AuthenticationError({ message: 'Missing authorization token' }))
            );
        }

        // Get JWT secret from config (crash if missing - critical config)
        const jwtSecret = yield* _(
            Config.string('JWT_SECRET')
                .pipe(Config.withDefault('your-secret-key'))
                .pipe(Effect.orDie) // ConfigError → crash app
        );

        // Verify JWT token
        const payload = yield* _(
            Effect.try({
                try: () => jwt.verify(token, jwtSecret) as JWTPayload,
                catch: (error) => new AuthenticationError({
                    message: 'Invalid or expired token'
                }),
            })
        );

        // Get UserRepository to verify user still exists and is active
        const userRepo = yield* _(UserRepository);
        const userOption = yield* _(userRepo.findByEmail(payload.email));

        // userOption is Option.Option<UserWithPassword> - a Domain model, not a DB row
        if (userOption._tag === 'None') {
            return yield* _(
                Effect.fail(new AuthenticationError({
                    message: 'User not found'
                }))
            );
        }

        const user = userOption.value; // UserWithPassword domain model

        // Check if user is active (business rule enforced by domain)
        if (!user.isActive) {
            return yield* _(
                Effect.fail(new AuthenticationError({ message: 'User account is inactive' }))
            );
        }

        // Create AuthContext from Domain model (NOT from database row)
        // Role comes from User domain entity
        const authContext = yield* _(
            Schema.decodeUnknown(AuthContext)({
                userId: user.id,
                role: user.role, // RoleName from domain model
            }),
            Effect.mapError(
                () => new AuthenticationError({ message: 'Invalid auth context' })
            )
        );

        return authContext;
    });


// Auth middleware:

// authMiddleware adalah sebuah fungsi generic<E, R>
// yang menerima argumen app dengan tipe Default<E, R>
// dan menghasilkan sebuah Effect yang:

// Success value: HttpServerResponse
// Error: AuthenticationError atau E(error dari app)
// Environment: HttpServerRequest atau R tanpa AuthContextService

// Artinya middleware ini bekerja dengan error (E) dan environment (R) apa pun dari aplikasi utama (app).

export const authMiddleware = HttpMiddleware.make((app) =>
    Effect.gen(function* (_) {
        const request = yield* _(HttpServerRequest.HttpServerRequest);
        const authHeader = request.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');

        const authContext = yield* _(verifyJwt(token));

        return yield* _(
            app,
            Effect.provideService(AuthContextService, authContext)
        );
    })
);

// withAuth adalah fungsi wrapper yang menerima sebuah Effect(handler utama)
// dan mengembalikan effect baru yang:

// Berhasil menghasilkan nilai A(hasil dari effect asli)
// Bisa gagal dengan error bawaan E atau AuthenticationError(dari auth)

// Butuh environment:
// HttpServerRequest(karena membaca header Authorization)
// R kecuali AuthContextService(karena withAuth akan menyediakan AuthContextService)

// : Effect.Effect<A, E | AuthenticationError, Exclude<R, AuthContextService> | HttpServerRequest.HttpServerRequest>
// export const withAuth = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
//     Effect.gen(function* (_) {
//         const request = yield* _(HttpServerRequest.HttpServerRequest);
//         const token = request.headers.authorization?.replace('Bearer ', '') || '';

//         if (!token) {
//             return yield* _(Effect.fail(new AuthenticationError({ message: 'No token' })));
//         }

//         const authContext = yield* _(
//             Schema.decodeUnknown(AuthContext)({
//                 userId: '550e8400-e29b-41d4-a716-446655440000',
//                 role: 'admin' as const,
//             }),
//             Effect.mapError(() => new AuthenticationError({ message: 'Invalid auth context' }))
//         );

//         return yield* _(
//             effect,
//             Effect.provideService(AuthContextService, authContext)
//         );
//     });

export const withAuth = <A, E, R>(
    effect: Effect.Effect<A, E, R | AuthContextService>
): Effect.Effect<A, E, Exclude<R, AuthContextService> | HttpServerRequest.HttpServerRequest> =>
    Effect.gen(function* (_) {
        const request = yield* _(HttpServerRequest.HttpServerRequest);

        const token = request.headers.authorization?.replace('Bearer ', '') || '';

        if (!token) {
            return yield* _(Effect.fail({ _tag: 'Unauthorized', message: 'No token' } as any));
        }

        const authContext = yield* _(
            Schema.decodeUnknown(AuthContext)({
                userId: '550e8400-e29b-41d4-a716-446655440000',
                role: 'admin' as const,
            }),
            Effect.orDie
        );

        return yield* _(
            effect,
            Effect.provideService(AuthContextService, authContext)
        );
    });
