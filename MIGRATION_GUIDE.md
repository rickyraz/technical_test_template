# Migration Guide: PostgreSQL to Drizzle ORM with JWT Authentication

## Changes Summary

### 1. Database Layer Migration
- **Removed**: Hardcoded admin/user database credentials
- **Added**: Drizzle ORM with postgres.js driver
- **Changed**: Single database connection instead of role-based connections

### 2. Authentication System
- **Removed**: Mock authentication with hardcoded roles
- **Added**: JWT-based authentication with database User lookup
- **Added**: Password hashing with bcrypt
- **Added**: AuthService for login and token management

### 3. New Files Created

#### Database Schema
- `src/db/schema.ts` - Drizzle schema definition for users table

#### Services
- `src/services/AuthService.ts` - Authentication and JWT token management

#### Configuration
- `.env.example` - Environment variables template
- `drizzle.config.ts` - Drizzle Kit configuration

### 4. Modified Files

#### Database Layer
- `src/db/client.ts`
  - Removed: `adminUser`, `adminPassword`, `userRoleUser`, `userRolePassword` from config
  - Added: Single `user` and `password` configuration
  - Added: Drizzle ORM integration
  - Changed: Returns `{ sql, db }` instead of `{ admin, user }`

- `src/db/connection.ts`
  - Simplified: Removed session context management (RLS)
  - Changed: Now just exposes Drizzle db instance
  - Removed: `withConnection` method

#### Repository Layer
- `src/repositories/UserRepository.ts`
  - Changed: All queries now use Drizzle ORM syntax
  - Added: `findByEmail` method for authentication
  - Removed: `requestingUserId` parameter (no longer needed for RLS)
  - Simplified: Direct database queries without connection wrapper

#### Service Layer
- `src/services/UserService.ts`
  - Updated: Adjusted calls to repository methods

#### Middleware
- `src/middleware/AuthMiddleware.ts`
  - Changed: `verifyJwt` now validates JWT and queries database
  - Added: User existence and active status verification
  - Added: UserRepository dependency for user lookup

## Environment Variables

Update your `.env` file with the following variables:

```env
# Database Configuration (Single User)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

## Migration Steps

### 1. Install Dependencies
Already installed:
- `drizzle-orm` - ORM library
- `drizzle-kit` - Migration tool
- `jsonwebtoken` - JWT handling
- `bcrypt` - Password hashing

### 2. Create Database Schema

Run Drizzle migrations to create the users table:

```bash
bun drizzle-kit generate
bun drizzle-kit migrate
```

Or manually create the table:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    salary NUMERIC(10, 2),
    ssn VARCHAR(11),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
```

### 3. Seed Initial Users

```sql
-- Admin user (password: admin123)
INSERT INTO users (name, email, role, password, is_active)
VALUES (
    'Admin User',
    'admin@example.com',
    'admin',
    '$2b$10$YourHashedPasswordHere',
    true
);

-- Regular user (password: user123)
INSERT INTO users (name, email, role, password, salary, ssn, is_active)
VALUES (
    'Regular User',
    'user@example.com',
    'user',
    '$2b$10$YourHashedPasswordHere',
    50000.00,
    '123-45-6789',
    true
);
```

To generate hashed passwords:

```typescript
import * as bcrypt from 'bcrypt';

const hash = await bcrypt.hash('your-password', 10);
console.log(hash);
```

### 4. Update AppLayer

Add AuthService to your layers if needed for login endpoints:

```typescript
// src/layers/AppLayer.ts
import { AuthServiceLive } from '../services/AuthService';

const AppLayer = UserHandlersLive.pipe(
    Layer.provide(UserServiceLive),
    Layer.provide(UserRepositoryLive),
    Layer.provide(AuthServiceLive),  // Add this
    Layer.provide(DatabaseConnectionLive),
    Layer.provide(DatabaseClientLive),
);
```

## Security Improvements

### Before
- ❌ Hardcoded database credentials for admin/user roles
- ❌ Mock authentication without password verification
- ❌ No user validation against database

### After
- ✅ Single database user with proper credentials
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ User validation against database
- ✅ Active status checking
- ✅ Token expiration

## API Usage

### Login (New Endpoint - To Be Implemented)

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "user123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Authenticated Requests

Include the JWT token in the Authorization header:

```http
GET /users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Breaking Changes

1. **Database Configuration**
   - Removed: `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`, `DB_USER_ROLE_USER`, `DB_USER_ROLE_PASSWORD`
   - Added: `DB_USER`, `DB_PASSWORD`

2. **Authentication**
   - All requests now require valid JWT token
   - No more role-based database connections
   - User context derived from JWT claims

3. **Repository Methods**
   - `findById(userId, role, requestingUserId)` → `findById(userId, role)`
   - `findAll(role, requestingUserId)` → `findAll(role)`
   - `update(userId, data, role, requestingUserId)` → `update(userId, data)`

## Next Steps

1. Implement login endpoint using AuthService
2. Remove old RLS policies from database (if any)
3. Update API documentation with JWT authentication
4. Add password reset functionality
5. Add user registration endpoint
6. Implement refresh token mechanism
