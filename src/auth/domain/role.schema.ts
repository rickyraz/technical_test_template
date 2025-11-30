import { Schema } from 'effect';

export const RoleName = Schema.Literal('admin', 'user');
export type RoleName = Schema.Schema.Type<typeof RoleName>;

export class Role extends Schema.Class<Role>('Role')({
    id: Schema.Number,
    name: RoleName,
    description: Schema.NullOr(Schema.String),
    createdAt: Schema.Date,
    updatedAt: Schema.Date,
}) { }