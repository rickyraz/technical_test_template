import { NotFoundError, ForbiddenError, UnauthorizedError, DatabaseError } from '../../../shared/errors/AppErrors';
import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    OpenApi,
} from '@effect/platform';
import { BaseUser, FullUser, UpdateUserProfile, UpdateSensitiveData } from '../../domain/User';
import { Schema } from 'effect';

// Api = contract/spec → tidak ada logic

// aannonate : An annotation is extra information associated with a particular point in a document or other piece of information. 
export const UsersGroup = HttpApiGroup.make('Users')
    // GET /users/me - Get current user profile
    .add(
        HttpApiEndpoint.get('getCurrentUser', '/users/me')
            .addSuccess(Schema.Union(BaseUser, FullUser))
            .addError(NotFoundError, { status: 404 })
            .addError(ForbiddenError, { status: 403 })
            .addError(UnauthorizedError, { status: 401 })
            .addError(DatabaseError, { status: 500 })
            .annotate(OpenApi.Title, 'Get Current User')
            .annotate(OpenApi.Description, "Retrieve the authenticated user profile")
    )
    // GET /users - Get all users
    .add(
        HttpApiEndpoint.get('getAllUsers', '/users')
            .addSuccess(Schema.Array(Schema.Union(BaseUser, FullUser)))
            .addError(UnauthorizedError, { status: 401 })
            .addError(DatabaseError, { status: 500 })
            .annotate(OpenApi.Title, "Get All Users")
            .annotate(OpenApi.Description, "Retrieve all users (admin sees all, user sees only themselves)")
    )
    // GET /users/:id - Get specific user
    .add(
        // HttpApiEndpoint.get('getUser', `/users/${id}`)
        HttpApiEndpoint.get('getUser', `/users/:id`)
            .addSuccess(Schema.Union(BaseUser, FullUser))
            .setPath(Schema.Struct({ id: Schema.UUID }))
            .addError(NotFoundError, { status: 404 })
            .addError(ForbiddenError, { status: 403 })
            .addError(UnauthorizedError, { status: 401 })
            .addError(DatabaseError, { status: 500 })
            .annotateContext(OpenApi.annotations({
                title: "Get User by ID",
                description: "Retrieve a specific user by their ID",
            }))
    )
    // PATCH /users/:id - Update user profile
    .add(
        // HttpApiEndpoint.patch('updateUser', `/users/${id}`)
        HttpApiEndpoint.patch('updateUser', `/users/:id`)
            .setPayload(UpdateUserProfile)
            .setPath(Schema.Struct({ id: Schema.UUID }))
            .addSuccess(Schema.Boolean)
            .addError(ForbiddenError, { status: 403 })
            .addError(DatabaseError, { status: 500 })
            .annotateContext(OpenApi.annotations({
                title: 'Update User Profile',
                description: 'Update user name and email',
            }))
    )
    // PATCH /users/:id/sensitive - Update sensitive data
    .add(
        // HttpApiEndpoint.patch('updateSensitiveData', `/users/${userIdParam}/sensitive`)
        HttpApiEndpoint.patch('updateSensitiveData', `/users/:id/sensitive`)
            .setPayload(UpdateSensitiveData)
            .addSuccess(Schema.Boolean)
            .setPath(Schema.Struct({ id: Schema.UUID }))
            .addError(ForbiddenError, { status: 403 })
            .addError(DatabaseError, { status: 500 })
            .annotateContext(OpenApi.annotations({
                title: 'Update Sensitive Data',
                description: 'Update salary and SSN (admin only)',
            }))
    );

export class UserApi extends HttpApi.make('UserApi').add(UsersGroup) { }
