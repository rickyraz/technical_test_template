import { Config, Context, Effect, Layer } from 'effect';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../user/infrastructure/user.repository';
import type { DatabaseError } from '../../shared/errors/infrastructure.errors';
import { AuthenticationError } from '../domain/auth.errors';

export class AuthService extends Context.Tag('AuthService')
    <AuthService,
        {
            readonly login: (
                email: string,
                password: string
            ) => Effect.Effect<{ token: string }, AuthenticationError | DatabaseError>;

            readonly generateToken: (
                userId: string,
                email: string,
                role: string
            ) => Effect.Effect<string, AuthenticationError>;

            readonly verifyPassword: (
                plainPassword: string,
                hashedPassword: string
            ) => Effect.Effect<boolean, never>;
        }
    >() { }

export const AuthServiceLive = Layer.effect(
    AuthService,
    Effect.gen(function* (_) {
        const userRepo = yield* _(UserRepository);

        const generateToken = (userId: string, email: string, role: string) =>
            Effect.gen(function* (_) {
                // Get JWT configuration (crash if missing - critical config)
                // const jwtSecret = (yield* _(
                //     Config.string('JWT_SECRET')
                //         .pipe(Config.withDefault('your-secret-key'))
                //         .pipe(Effect.orDie) // ConfigError → crash app
                // )) as string;

                const jwtSecret = (yield* _(
                    Config.string('JWT_SECRET')
                        .pipe(Config.withDefault('your-secret-key'))
                        .pipe(Effect.orDie)
                )) as jwt.Secret;

                // const expiresIn = (yield* _(
                //     Config.string('JWT_EXPIRES_IN')
                //         .pipe(Config.withDefault('24h'))
                //         .pipe(Effect.orDie) // ConfigError → crash app
                // )) as string;

                const expiresIn = (yield* _(
                    Config.string('JWT_EXPIRES_IN')
                        .pipe(Config.withDefault('24h'))
                        .pipe(Effect.orDie)
                )) as jwt.SignOptions["expiresIn"];

                const token = yield* _(
                    Effect.try({
                        try: (): string =>
                            jwt.sign(
                                { userId, email, role },
                                jwtSecret,
                                { expiresIn }
                            ) as string,
                        catch: () => new AuthenticationError({
                            message: 'Failed to generate token'
                        }),
                    })
                );

                return token;
            });

        const verifyPassword = (plainPassword: string, hashedPassword: string) =>
            Effect.promise(() => bcrypt.compare(plainPassword, hashedPassword));

        const login = (email: string, password: string) =>
            Effect.gen(function* (_) {
                // Find user by email
                const userOption = yield* _(userRepo.findByEmail(email));

                // userOption is Option.Option<UserWithPassword> from repository
                // This is a Domain model, not a database row
                if (userOption._tag === 'None') {
                    return yield* _(
                        Effect.fail(new AuthenticationError({
                            message: 'Invalid email or password'
                        }))
                    );
                }

                const user = userOption.value; // UserWithPassword domain model

                // Check if user is active (business rule from domain)
                if (!user.isActive) {
                    return yield* _(
                        Effect.fail(new AuthenticationError({
                            message: 'User account is inactive'
                        }))
                    );
                }

                // Verify password (authentication logic)
                const isPasswordValid = yield* _(verifyPassword(password, user.password));

                if (!isPasswordValid) {
                    return yield* _(
                        Effect.fail(new AuthenticationError({
                            message: 'Invalid email or password'
                        }))
                    );
                }

                // Generate JWT token
                const token = yield* _(generateToken(user.id, user.email, user.role));

                return { token };
            });

        return {
            login,
            generateToken,
            verifyPassword,
        };
    })
);
