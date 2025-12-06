# Quiz App Economy System

## Overview

This document describes the in-app economy system for the quiz application, consisting of two primary currencies: **Energy** and **Diamonds**.

---

## Currencies

### Energy (Regenerating Currency)
- **Purpose**: Required to play quizzes
- **Default Max**: 5 energy
- **Regeneration**: 1 energy every 30 minutes (automatic)
- **Consumption**: 1 energy per quiz attempt
- **Refill Options**:
  - Wait for automatic regeneration
  - Purchase with diamonds (10 diamonds = 1 energy)

### Diamonds (Premium Currency)
- **Purpose**: Premium currency for purchases
- **Acquisition**:
  - In-App Purchases (IAP)
  - Rewards and promotions
  - Admin grants
- **Uses**:
  - Refill energy instantly
  - Purchase boosts and power-ups
  - Unlock premium content

---

## API Endpoints

### Energy Endpoints

#### `GET /energy`
Get current energy status with auto-refill calculation.

**Response:**
```json
{
  "energy": 3,
  "maxEnergy": 5,
  "nextRefillAt": "2025-12-06T22:00:00Z",
  "refillRate": 30
}
```

#### `POST /energy/consume`
Consume energy (e.g., when starting a quiz).

**Request Body:**
```json
{
  "amount": 1,
  "reason": "quiz_play",
  "metadata": {
    "quizId": 123
  },
  "idempotencyKey": "unique-key-123"
}
```

**Response:**
```json
{
  "energy": 2,
  "maxEnergy": 5
}
```

#### `POST /energy/refill`
Refill energy using diamonds.

**Request Body:**
```json
{
  "amount": 5,
  "idempotencyKey": "unique-key-456"
}
```

**Response:**
```json
{
  "energy": 5,
  "maxEnergy": 5,
  "diamondsSpent": 50
}
```

#### `GET /energy/pricing`
Get diamond pricing for energy refills.

**Response:**
```json
{
  "costPerEnergy": 10,
  "refillRate": 30
}
```

#### `GET /energy/transactions`
Get energy transaction history.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "type": "energy_consume",
    "amount": -1,
    "balanceBefore": 3,
    "balanceAfter": 2,
    "reason": "quiz_play",
    "createdAt": "2025-12-06T21:30:00Z"
  }
]
```

#### `POST /energy/admin/grant` (Admin Only)
Grant energy to a user.

**Request Body:**
```json
{
  "userId": 1,
  "amount": 5,
  "reason": "compensation"
}
```

---

### Diamond Endpoints

#### `GET /diamonds/balance`
Get current diamond balance.

**Response:**
```json
{
  "diamonds": 150
}
```

#### `POST /diamonds/purchase`
Purchase diamonds (called after payment verification).

**Request Body:**
```json
{
  "amount": 100,
  "receiptId": "txn_1234567890",
  "provider": "stripe",
  "idempotencyKey": "purchase-key-789"
}
```

**Response:**
```json
{
  "diamonds": 250,
  "transactionId": 42
}
```

#### `POST /diamonds/spend`
Spend diamonds on in-app purchases.

**Request Body:**
```json
{
  "amount": 50,
  "reason": "energy_refill",
  "metadata": {
    "productId": "energy_pack_5"
  },
  "idempotencyKey": "spend-key-101"
}
```

**Response:**
```json
{
  "diamonds": 200,
  "transactionId": 43
}
```

#### `POST /diamonds/refund`
Refund diamonds to user.

**Request Body:**
```json
{
  "amount": 50,
  "reason": "failed_purchase",
  "originalTransactionId": "42"
}
```

**Response:**
```json
{
  "diamonds": 250,
  "transactionId": 44
}
```

#### `GET /diamonds/transactions`
Get diamond transaction history.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

#### `POST /diamonds/admin/grant` (Admin Only)
Grant diamonds to a user.

**Request Body:**
```json
{
  "userId": 1,
  "amount": 100,
  "reason": "promotion"
}
```

---

## Database Schema

### UserStats Model
```prisma
model UserStats {
  id                 Int       @id @default(autoincrement())
  userId             Int       @unique
  
  // Currencies
  xp                 Int       @default(0)
  gems               Int       @default(0)
  diamonds           Int       @default(0)
  
  // Energy System
  energy             Int       @default(5)
  maxEnergy          Int       @default(5)
  lastEnergyRefillAt DateTime  @default(now())
  
  // ... other fields
}
```

### CurrencyTransaction Model
```prisma
model CurrencyTransaction {
  id             Int       @id @default(autoincrement())
  userId         Int
  
  type           String    // energy_refill_auto, diamond_purchase, etc.
  currency       String    // energy, diamonds, gems
  amount         Int       // positive for credit, negative for debit
  
  balanceBefore  Int
  balanceAfter   Int
  
  reason         String?
  metadata       Json?
  
  idempotencyKey String?   @unique
  createdAt      DateTime  @default(now())
}
```

---

## Transaction Types

### Energy Transactions
- `energy_refill_auto` - Automatic regeneration
- `energy_refill_diamond` - Refilled with diamonds
- `energy_consume` - Used for quiz play
- `energy_reward` - Granted as reward

### Diamond Transactions
- `diamond_purchase` - Purchased via IAP
- `diamond_spend` - Spent on items
- `diamond_reward` - Granted as reward
- `diamond_refund` - Refunded to user

---

## Features

### ✅ Idempotency
All currency operations support idempotency keys to prevent duplicate transactions. This is critical for:
- Preventing double-charging
- Handling network retries
- Ensuring data consistency

### ✅ Atomic Transactions
All currency operations use database transactions to ensure:
- Balance updates are atomic
- Transaction history is always recorded
- No partial updates on failure

### ✅ Audit Trail
Every currency movement is logged in the `CurrencyTransaction` table with:
- Before/after balances
- Transaction type and reason
- Metadata for context
- Timestamp for tracking

### ✅ Auto-Regeneration
Energy automatically regenerates:
- 1 energy every 30 minutes
- Calculated on-demand (no cron jobs needed)
- Prevents time drift with precise timestamp tracking

### ✅ Validation
- Insufficient balance checks
- Maximum capacity checks
- Duplicate transaction prevention
- Input validation with DTOs

---

## Configuration

### Energy Settings
Located in `energy.service.ts`:
```typescript
private readonly REFILL_RATE_MINUTES = 30;
private readonly ENERGY_PER_REFILL = 1;
private readonly DIAMOND_COST_PER_ENERGY = 10;
```

### Customization
To modify the economy:
1. Update constants in service files
2. Adjust default values in Prisma schema
3. Run migrations: `npx prisma migrate dev`

---

## Security Considerations

### Authentication
- All endpoints should be protected with JWT authentication
- Uncomment `@UseGuards(JwtAuthGuard)` decorators when auth is ready
- Admin endpoints require additional role-based guards

### Payment Verification
- Always verify payment receipts server-side before granting diamonds
- Use webhook handlers for payment providers
- Implement receipt validation with provider APIs

### Rate Limiting
- Implement rate limiting on all endpoints
- Especially important for purchase endpoints
- Prevent abuse and brute force attempts

---

## Testing

### Manual Testing
Use the provided endpoints to test:
1. Energy regeneration
2. Energy consumption
3. Diamond purchases
4. Energy refills with diamonds
5. Transaction history

### Example Flow
```bash
# Get current energy
GET /energy

# Consume energy for quiz
POST /energy/consume
{
  "amount": 1,
  "reason": "quiz_play",
  "metadata": { "quizId": 1 }
}

# Purchase diamonds
POST /diamonds/purchase
{
  "amount": 100,
  "receiptId": "test_receipt_123",
  "provider": "test"
}

# Refill energy with diamonds
POST /energy/refill
{
  "amount": 5
}

# Check transaction history
GET /energy/transactions
GET /diamonds/transactions
```

---

## Migration Guide

### Running Migrations
```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_diamonds_and_transactions

# For production
npx prisma migrate deploy
```

### Rollback
If you need to rollback:
```bash
# Reset database (development only)
npx prisma migrate reset

# For production, create a down migration manually
```

---

## Future Enhancements

### Potential Features
- [ ] Energy packs (buy multiple energy at discount)
- [ ] Daily login bonuses
- [ ] Energy overflow (temporary extra energy)
- [ ] Diamond subscriptions
- [ ] Referral rewards
- [ ] Achievement-based currency grants
- [ ] Time-limited promotions
- [ ] Currency exchange rates

### Analytics
Consider tracking:
- Average energy consumption per user
- Diamond purchase conversion rates
- Most popular refill amounts
- Peak usage times
- Currency balance distributions

---

## Support

For questions or issues:
1. Check transaction logs in database
2. Review service logs for errors
3. Verify Prisma client is up to date
4. Ensure migrations are applied

---

## License

This economy system is part of the quiz application backend.
