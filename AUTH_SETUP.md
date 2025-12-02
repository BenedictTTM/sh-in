# Authentication System Setup Guide

## 🚀 Production-Grade Authentication for High-Traffic Applications

This authentication system follows enterprise best practices, clean architecture, and SOLID principles, designed for high-traffic, scalable applications.

---

## 📋 Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **PostgreSQL**: v14+ (production database)
- **npm** or **yarn**: Package manager
- **TypeScript**: v5+

---

## 🔧 Installation Steps

### 1. Install Dependencies

**IMPORTANT**: You need to install these packages (disk space issue detected):

```bash
npm install @nestjs/jwt @nestjs/config @prisma/client bcrypt class-validator class-transformer
npm install -D prisma @types/bcrypt
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your actual values
# CRITICAL: Change JWT secrets in production!
```

**Generate secure JWT secrets:**

```bash
# On Linux/Mac
openssl rand -base64 64

# On Windows (PowerShell)
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### 4. Verify Setup

```bash
# Build the application
npm run build

# Run in development mode
npm run start:dev

# Test authentication endpoint
curl http://localhost:4000/auth/health
```

---

## 🏗️ Architecture Overview

### Service Layer Design (Clean Architecture)

```
auth/
├── services/
│   ├── token.service.ts         # JWT token management
│   ├── signup.service.ts        # User registration
│   ├── login.service.ts         # User authentication
│   ├── logout.service.ts        # Session termination
│   ├── refresh-token.service.ts # Token rotation
│   ├── passwordReset.service.ts # Password recovery
│   └── oauth.service.ts         # OAuth integration
├── dto/                         # Data Transfer Objects
├── guards/                      # Authentication guards
└── strategies/                  # Passport strategies
```

### SOLID Principles Applied

1. **Single Responsibility**: Each service handles one concern
2. **Open/Closed**: Extensible via dependency injection
3. **Liskov Substitution**: Services implement common interfaces
4. **Interface Segregation**: Small, focused service contracts
5. **Dependency Inversion**: Depend on abstractions (PrismaService)

---

## 🔐 Security Features

### Password Security

- **Bcrypt hashing** with configurable rounds (default: 12)
- **Strong password policy** enforcement
- **Password history** tracking (prevents reuse)

### Token Security

- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days) with rotation
- **Token hashing**: SHA-256 for storage
- **Token family tracking**: Prevents replay attacks
- **Automatic revocation**: On logout

### Account Protection

- **Rate limiting**: Prevents brute force attacks
- **Account locking**: After failed login attempts
- **IP tracking**: Logs suspicious activity
- **Device tracking**: Multi-device session management

### Password Reset

- **One-time tokens**: Auto-expire after use
- **Time-limited**: 1-hour expiration
- **Secure delivery**: Email-based (configurable)

---

## 📡 API Endpoints

### Authentication

#### POST `/auth/signup`

Register new user and receive tokens immediately.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 900
}
```

#### POST `/auth/login`

Authenticate and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as signup

#### POST `/auth/refresh`

Exchange refresh token for new token pair.

**Request:**

```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response:**

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 900
}
```

#### POST `/auth/logout`

Revoke current refresh token.

**Request:**

```json
{
  "userId": 1,
  "refreshToken": "eyJhbGci..."
}
```

#### POST `/auth/logout-all`

Revoke all refresh tokens (all devices).

**Request:**

```json
{
  "userId": 1
}
```

### Password Reset

#### POST `/auth/password-reset/request`

Request password reset token.

**Request:**

```json
{
  "email": "user@example.com"
}
```

#### POST `/auth/password-reset/confirm`

Reset password with token.

**Request:**

```json
{
  "token": "reset-token-here",
  "newPassword": "NewSecurePass123!"
}
```

---

## 🚀 Production Deployment Checklist

### Environment Variables

- ✅ Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- ✅ Use strong `DATABASE_URL` with SSL
- ✅ Configure `BCRYPT_ROUNDS` (12-14 recommended)
- ✅ Set up SMTP for password reset emails
- ✅ Configure CORS origins

### Database

- ✅ Run migrations: `npx prisma migrate deploy`
- ✅ Enable connection pooling
- ✅ Set up database backups
- ✅ Create read replicas for scaling

### Application

- ✅ Enable HTTPS/TLS
- ✅ Set up reverse proxy (nginx/AWS ALB)
- ✅ Configure rate limiting
- ✅ Enable request logging
- ✅ Set up monitoring (DataDog, New Relic, etc.)

### Security

- ✅ Enable helmet middleware
- ✅ Configure CORS properly
- ✅ Set up WAF (Web Application Firewall)
- ✅ Enable API key rotation
- ✅ Implement token blacklist with Redis

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 📊 Performance Optimization

### Database Indexes

All critical fields are indexed:

- `users.email` (unique)
- `refresh_tokens.token_hash` (unique)
- `refresh_tokens.user_id`
- `password_reset_tokens.token_hash`

### Caching Strategy

- Cache user data with Redis (TTL: 15 minutes)
- Cache token blacklist
- Implement query result caching

### Horizontal Scaling

- Stateless services (no in-memory sessions)
- Database connection pooling
- Load balancer compatible
- Redis for distributed sessions

---

## 🔍 Monitoring & Observability

### Key Metrics to Monitor

- Token generation rate
- Failed login attempts
- Active sessions per user
- Password reset requests
- API response times
- Database query performance

### Logging

All services include comprehensive logging:

- Authentication attempts
- Token operations
- Security events
- Error tracking

---

## 🛡️ Compliance & Best Practices

### OWASP Top 10 Protection

- ✅ Injection prevention (Prisma parameterized queries)
- ✅ Broken authentication prevention
- ✅ Sensitive data exposure prevention
- ✅ XML external entities prevention
- ✅ Broken access control prevention
- ✅ Security misconfiguration prevention
- ✅ XSS prevention
- ✅ Insecure deserialization prevention
- ✅ Using components with known vulnerabilities prevention
- ✅ Insufficient logging & monitoring prevention

### GDPR Compliance

- User data encryption
- Right to deletion (soft delete)
- Data export capabilities
- Audit logging

---

## 🤝 Contributing

Follow these principles when extending:

1. Maintain single responsibility per service
2. Add comprehensive error handling
3. Include logging for security events
4. Write unit tests (>80% coverage)
5. Update documentation

---

## 📝 License

Proprietary - All rights reserved

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Cannot find module '@nestjs/jwt'"

```bash
npm install @nestjs/jwt @nestjs/config
```

**Issue**: "Property 'refreshToken' does not exist"

```bash
npx prisma generate
npx prisma migrate dev
```

**Issue**: "Invalid token"

- Check JWT_ACCESS_SECRET and JWT_REFRESH_SECRET match
- Verify token hasn't expired
- Ensure token wasn't revoked

---

## 📞 Support

For production support, contact the backend team lead.
