import { pgTable, uuid, varchar, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';

/**
 * Database Schema - Infrastructure Layer
 *
 * IMPORTANT: This schema FOLLOWS the Domain model (src/domain/User.ts)
 * NOT the other way around!
 *
 * Database is just a persistence mechanism.
 * Domain defines the business rules and structure.
 */

export const usersTable = pgTable('users', {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Core fields from BaseUser domain model
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    role: varchar('role', { length: 50 }).notNull(), // Maps to RoleName domain ('admin' | 'user')
    isActive: boolean('is_active').notNull().default(true),

    // Authentication (UserWithPassword domain model)
    password: varchar('password', { length: 255 }).notNull(), // bcrypt hashed

    // Sensitive fields from SensitiveUserData domain model
    salary: numeric('salary', { precision: 10, scale: 2 }), // nullable
    ssn: varchar('ssn', { length: 12 }), // nullable, format: XXX-XX-XXXX

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Database types (Infrastructure concerns - NOT Domain)
export type UserRow = typeof usersTable.$inferSelect;
export type InsertUserRow = typeof usersTable.$inferInsert;
