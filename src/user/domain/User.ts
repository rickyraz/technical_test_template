import { Schema } from 'effect';
import { RoleName } from '../../auth/domain/Role';

// Domain: User Entity (Source of Truth)
// This represents the business domain, NOT the database structure

// Base user schema (visible to all authenticated users)
export class BaseUser extends Schema.Class<BaseUser>('BaseUser')({
    id: Schema.UUID,
    email: Schema.String.pipe(
        Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/), // email validation
        Schema.annotations({ description: "Invalid email format" })
    ),
    name: Schema.String.pipe(
        Schema.minLength(1),
        Schema.maxLength(255),
        Schema.annotations({ description: "Name must be between 1-255 characters" })
    ),
    role: RoleName, // Role is embedded in User (no foreign key in domain)
    isActive: Schema.Boolean,
    createdAt: Schema.DateFromSelf,
    updatedAt: Schema.DateFromSelf,
}) { }

// Sensitive fields (admin only)
export class SensitiveUserData extends Schema.Class<SensitiveUserData>(
    'SensitiveUserData'
)({
    salary: Schema.NullOr(
        Schema.Number.pipe(
            Schema.greaterThanOrEqualTo(0),
            Schema.annotations({ description: "Salary must be non-negative" })
        )
    ),
    ssn: Schema.NullOr(
        Schema.String.pipe(
            Schema.pattern(/^\d{3}-\d{2}-\d{4}$/),
            Schema.annotations({ description: "SSN must be in format XXX-XX-XXXX", })
        )
    ),
}) { }

// Full user entity (admin view) - Domain aggregate root
export class FullUser extends BaseUser.extend<FullUser>('FullUser')(
    SensitiveUserData.fields
) { }

// User with password (used for authentication, never exposed via API)
export class UserWithPassword extends FullUser.extend<UserWithPassword>('UserWithPassword')({
    password: Schema.String.pipe(
        Schema.minLength(8),
        Schema.annotations({ description: "Password must be at least 8 characters" })
    ),
}) { }

// Conditional user type based on role
export type UserByRole<R extends RoleName> = R extends 'admin'
    ? FullUser
    : BaseUser;

// User safe view with masked data
export class UserSafeView extends BaseUser.extend<UserSafeView>(
    'UserSafeView'
)({
    salary: Schema.NullOr(Schema.Number),
    ssnMasked: Schema.NullOr(Schema.String),
}) { }

// Audit log
export class AuditLog extends Schema.Class<AuditLog>('AuditLog')({
    id: Schema.BigInt,
    tableName: Schema.String,
    recordId: Schema.UUID,
    action: Schema.Literal('INSERT', 'UPDATE', 'DELETE'),
    oldData: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown, })),
    newData: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown, })),
    changedBy: Schema.String,
    changedByRole: RoleName,
    changedAt: Schema.Date,
}) { }

// DTOs for updates
export class UpdateUserProfile extends Schema.Class<UpdateUserProfile>(
    'UpdateUserProfile'
)({
    name: Schema.optional(Schema.String),
    email: Schema.optional(Schema.String),
}) { }

export class UpdateSensitiveData extends Schema.Class<UpdateSensitiveData>(
    'UpdateSensitiveData'
)({
    salary: Schema.optional(Schema.NullOr(Schema.Number)),
    ssn: Schema.optional(Schema.NullOr(Schema.String)),
}) { }