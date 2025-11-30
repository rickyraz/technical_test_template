# Domain-Driven Design Architecture

## Architecture Principles

This codebase follows **Domain-Driven Design (DDD)** principles, specifically:
- **Clean Architecture**
- **Hexagonal Architecture** (Ports and Adapters)
- **Onion Architecture**

### Core Principle: Domain Independence

```
┌─────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                         │
│            (Effect Schema - Source of Truth)            │
│                                                          │
│  • Business Rules                                       │
│  • Validations                                          │
│  • Invariants                                           │
│  • Domain Models (User, Role, etc.)                     │
│                                                          │
│  ✅ Independent of database                             │
│  ✅ Independent of HTTP framework                       │
│  ✅ Pure business logic                                 │
└─────────────────────────────────────────────────────────┘
                         ↑
                         │
                    FOLLOWS
                         │
┌─────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER                       │
│             (Drizzle ORM + PostgreSQL)                  │
│                                                          │
│  • Database schema (src/db/schema.ts)                   │
│  • Persistence                                          │
│  • Queries                                              │
│                                                          │
│  ❌ Does NOT define business rules                      │
│  ✅ Just stores and retrieves data                      │
└─────────────────────────────────────────────────────────┘
```

## Why This Matters

### ❌ Anti-Pattern: Database-First
```typescript
// BAD: Domain follows database
type User = typeof usersTable.$inferSelect; // Domain tied to DB!

// Business logic depends on database types
function validateUser(user: User) { ... }
```

**Problems:**
- Business rules depend on database structure
- Can't change database without breaking domain
- Hard to test without database
- Violates Single Responsibility Principle

### ✅ Correct: Domain-First
```typescript
// GOOD: Domain is independent
export class User extends Schema.Class<User>('User')({
  id: Schema.UUID,
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    Schema.annotations({ message: "Invalid email" })
  ),
  role: RoleName, // Domain concept, not FK
  // ... business validations here
}) { }

// Database follows domain
export const usersTable = pgTable('users', {
  id: uuid('id'), // Maps to User.id
  email: varchar('email'), // Maps to User.email
  role: varchar('role'), // Maps to User.role
  // ... infrastructure details
});
```

**Benefits:**
- ✅ Domain defines business truth
- ✅ Database is just persistence detail
- ✅ Can swap database without changing domain
- ✅ Easy to test domain logic
- ✅ Clear separation of concerns

## Layer Structure

### 1. Domain Layer (`src/domain/`)

**Responsibility:** Define business entities, rules, and validations

**Files:**
- `User.ts` - User entity with business validations
- `Role.ts` - Role value object
- `AuthContext.ts` - Authentication domain model

**Example:**
```typescript
// src/domain/User.ts
export class BaseUser extends Schema.Class<BaseUser>('BaseUser')({
  id: Schema.UUID,
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    Schema.annotations({ message: "Invalid email format" })
  ),
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ),
  role: RoleName, // Not roleId! Role is embedded in domain
  isActive: Schema.Boolean,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
}) { }
```

**Key Points:**
- Uses Effect Schema for type-safe validation
- Business rules encoded in schema
- No database types
- No infrastructure dependencies

### 2. Infrastructure Layer (`src/db/`)

**Responsibility:** Persistence and database operations

**Files:**
- `schema.ts` - Drizzle schema (follows domain)
- `client.ts` - Database connection
- `connection.ts` - Database layer wrapper

**Example:**
```typescript
// src/db/schema.ts
/**
 * IMPORTANT: This schema FOLLOWS the Domain model
 * NOT the other way around!
 */
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // Stores 'admin' | 'user'
  // ... maps to domain fields
});
```

### 3. Repository Layer (`src/repositories/`)

**Responsibility:** Bridge between Domain and Infrastructure

**Files:**
- `UserRepository.ts` - Data access (returns Domain models)
- `UserMapper.ts` - Anti-Corruption Layer (transforms DB ↔ Domain)

**Architecture:**
```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Service    │────▶│ Repository  │────▶│   Database   │
│   (Domain)   │     │  (Mapper)   │     │ (Drizzle)    │
└──────────────┘     └─────────────┘     └──────────────┘
       ↓                     ↓                    ↓
  Domain Model          Transforms          DB Row
  (FullUser)         DB Row → Domain   (usersTable)
```

**Example:**
```typescript
// src/repositories/UserRepository.ts
findById<R extends RoleName>(userId: string, role: R) {
  // 1. Query database (Drizzle)
  const rows = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  // 2. Transform to Domain model (Mapper)
  const user = await UserMapper.toUserByRole(rows[0], role);

  // 3. Return Domain model (NOT database row!)
  return Option.some(user); // user is BaseUser | FullUser
}
```

### 4. Anti-Corruption Layer (`UserMapper`)

**Responsibility:** Transform between database representation and domain model

**Purpose:**
- Protect domain from infrastructure changes
- Validate data coming from database
- Map database types to domain types

**Example:**
```typescript
// src/repositories/UserMapper.ts
export class UserMapper {
  static toFullUser(row: UserRow): Effect<FullUser, DatabaseError> {
    return Schema.decodeUnknown(FullUser)({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role, // Validate against RoleName schema
      salary: row.salary ? parseFloat(row.salary) : null,
      ssn: row.ssn,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    // Schema.decodeUnknown validates against domain rules!
  }
}
```

**Benefits:**
- Domain validation happens during mapping
- Database changes don't affect domain
- Type-safe transformations
- Clear boundary between layers

## Role Handling: Domain vs Database

### Domain Perspective
```typescript
// src/domain/User.ts
export const RoleName = Schema.Literal('admin', 'user');
export type RoleName = Schema.Schema.Type<typeof RoleName>;

export class BaseUser extends Schema.Class<BaseUser>('BaseUser')({
  role: RoleName, // Role is part of User entity
  // No roleId, no foreign key - it's a value object
}) { }
```

**Why no Role table?**
- Role is a **Value Object**, not an Entity
- Only 2 values: 'admin' | 'user'
- No complex role hierarchy
- Part of User's identity
- Simpler domain model

**When to use Role table:**
- Dynamic roles (user-defined)
- Role permissions mapping
- Hierarchical roles
- Audit trail for role changes

**Current design:** Role is embedded in User (DDD Value Object pattern)

### Database Perspective
```typescript
// src/db/schema.ts
export const usersTable = pgTable('users', {
  role: varchar('role', { length: 50 }).notNull(),
  // Stores literal string: 'admin' or 'user'
  // Could add CHECK constraint for validation
});
```

### Validation Flow
```
User Input → Domain Schema → Mapper → Database
     ↓              ↓            ↓         ↓
  "admin"    RoleName check   Valid   Stored
  "hacker"     ❌ Fails      N/A       N/A
```

## Testing Benefits

### Domain Testing (Pure)
```typescript
// test/domain/User.test.ts
test('validates email format', () => {
  const result = Schema.decodeUnknown(BaseUser)({
    email: 'invalid-email',
    // ...
  });

  // No database needed!
  expect(result).toBeLeft();
});
```

### Repository Testing (With DB)
```typescript
// test/repositories/UserRepository.test.ts
test('returns FullUser for admin role', async () => {
  const user = await repo.findById(userId, 'admin');

  // Tests mapper + database
  expect(user).toBeInstanceOf(FullUser);
  expect(user.salary).toBeDefined();
});
```

## Key Takeaways

### ✅ DO
1. **Define business rules in Domain layer**
2. **Use Effect Schema for domain validation**
3. **Repository returns Domain models**
4. **Database schema follows domain structure**
5. **Use Mapper to transform DB ↔ Domain**

### ❌ DON'T
1. **Let database types leak into domain**
2. **Put business logic in repository**
3. **Skip validation during mapping**
4. **Use database types in services**
5. **Tightly couple domain to infrastructure**

## Architecture Layers Summary

```
┌──────────────────────────────────────────────────┐
│         API Layer (HTTP Handlers)                │
│  src/api/UserHandlers.ts                         │
│  • HTTP request/response                         │
│  • Uses Domain models                            │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│      Application Layer (Services)                │
│  src/services/UserService.ts                     │
│  • Business workflows                            │
│  • Orchestration                                 │
│  • Uses Domain models                            │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│         Domain Layer (Core Business)             │
│  src/domain/User.ts, Role.ts                     │
│  • Entities, Value Objects                       │
│  • Business rules                                │
│  • Effect Schema validations                     │
│  • ✅ INDEPENDENT OF EVERYTHING                  │
└──────────────────────────────────────────────────┘
                      ↑
┌─────────────────────┴────────────────────────────┐
│     Repository Layer (Anti-Corruption)           │
│  src/repositories/UserRepository.ts              │
│  src/repositories/UserMapper.ts                  │
│  • Transforms DB → Domain                        │
│  • Protects domain from infrastructure           │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│    Infrastructure Layer (Persistence)            │
│  src/db/schema.ts, client.ts                     │
│  • Database schema (Drizzle)                     │
│  • SQL queries                                   │
│  • Follows domain structure                      │
└──────────────────────────────────────────────────┘
```

This architecture ensures:
- **Testability**: Test domain without database
- **Flexibility**: Swap database without changing business logic
- **Clarity**: Clear separation of concerns
- **Maintainability**: Changes isolated to appropriate layers
- **Type Safety**: Effect Schema validates at boundaries
