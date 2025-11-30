import { Context, Data } from 'effect';
import { Schema } from 'effect';
import { RoleName } from './Role';

export class AuthContext extends Schema.Class<AuthContext>('AuthContext')({
    userId: Schema.UUID,
    role: RoleName,
}) { }

export class AuthContextService extends Context.Tag('AuthContextService')
    <AuthContextService,
        AuthContext
    >() { }

export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
    readonly message: string;
}> { }
