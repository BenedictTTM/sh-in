# Quick Start Guide - Economy System

## 🚀 Getting Started

### 1. Generate Prisma Client
The Prisma client has already been generated, but if you need to regenerate:
```bash
npx prisma generate
```

### 2. Run Database Migration
Apply the schema changes to your database:
```bash
npx prisma migrate dev --name add_diamonds_and_transactions
```

Or for production:
```bash
npx prisma migrate deploy
```

### 3. Start the Server
```bash
npm run start:dev
```

### 4. Test the Endpoints
Run the test script:
```powershell
.\test-economy.ps1
```

Or test manually with curl/Postman using the endpoints below.

---

## 📍 Quick Reference - API Endpoints

### Energy
```bash
# Get energy status
GET http://localhost:3000/energy

# Consume energy
POST http://localhost:3000/energy/consume
{
  "amount": 1,
  "reason": "quiz_play",
  "metadata": { "quizId": 1 }
}

# Refill with diamonds
POST http://localhost:3000/energy/refill
{
  "amount": 5
}

# Get pricing
GET http://localhost:3000/energy/pricing

# Get history
GET http://localhost:3000/energy/transactions?limit=10
```

### Diamonds
```bash
# Get balance
GET http://localhost:3000/diamonds/balance

# Purchase (after payment verification)
POST http://localhost:3000/diamonds/purchase
{
  "amount": 100,
  "receiptId": "txn_123",
  "provider": "stripe"
}

# Spend
POST http://localhost:3000/diamonds/spend
{
  "amount": 50,
  "reason": "energy_refill"
}

# Get history
GET http://localhost:3000/diamonds/transactions?limit=10
```

---

## 🔧 Configuration

### Modify Economy Settings
Edit `src/modules/energy/energy.service.ts`:
```typescript
private readonly REFILL_RATE_MINUTES = 30;      // Change refill rate
private readonly ENERGY_PER_REFILL = 1;         // Change refill amount
private readonly DIAMOND_COST_PER_ENERGY = 10;  // Change pricing
```

### Modify Default Values
Edit `prisma/schema.prisma`:
```prisma
energy    Int @default(5)      // Starting energy
maxEnergy Int @default(5)      // Max energy
diamonds  Int @default(0)      // Starting diamonds
```

After changes, run:
```bash
npx prisma migrate dev --name your_change_name
```

---

## 🧪 Testing Flow

### Complete Test Scenario
```bash
# 1. Check initial state
GET /energy              # Should show 5/5 energy
GET /diamonds/balance    # Should show 0 diamonds

# 2. Purchase diamonds
POST /diamonds/purchase
{
  "amount": 100,
  "receiptId": "test_123",
  "provider": "test"
}

# 3. Consume energy
POST /energy/consume
{
  "amount": 1,
  "reason": "quiz_play"
}

# 4. Refill energy with diamonds
POST /energy/refill
{
  "amount": 1
}

# 5. Check transaction history
GET /energy/transactions
GET /diamonds/transactions
```

---

## 📊 Database Queries

### Check User Stats
```sql
SELECT * FROM user_stats WHERE user_id = 1;
```

### Check Transaction History
```sql
SELECT * FROM currency_transactions 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Energy Transactions
```sql
SELECT * FROM currency_transactions 
WHERE user_id = 1 AND currency = 'energy'
ORDER BY created_at DESC;
```

### Check Diamond Transactions
```sql
SELECT * FROM currency_transactions 
WHERE user_id = 1 AND currency = 'diamonds'
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Prisma Client Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (dev only - deletes all data!)
npx prisma migrate reset
```

### TypeScript Errors
```bash
# Check for type errors
npm run build

# If errors persist, restart TypeScript server in VS Code
Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

### Migration Errors
```bash
# Check migration status
npx prisma migrate status

# If stuck, you may need to reset (dev only)
npx prisma migrate reset
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Enable JWT authentication guards in controllers
- [ ] Add admin role guards for admin endpoints
- [ ] Implement rate limiting
- [ ] Add payment receipt verification
- [ ] Set up webhook handlers for payment providers
- [ ] Enable CORS with proper origins
- [ ] Add request logging
- [ ] Set up monitoring and alerts
- [ ] Review and test error handling
- [ ] Implement proper secrets management

---

## 📚 Documentation

- **Full Documentation**: `ECONOMY_SYSTEM.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Test Script**: `test-economy.ps1`
- **API Docs**: http://localhost:3000/api (Swagger UI when server is running)

---

## 🎯 Common Use Cases

### 1. User Plays Quiz
```typescript
// Consume 1 energy
POST /energy/consume
{
  "amount": 1,
  "reason": "quiz_play",
  "metadata": { "quizId": 123 },
  "idempotencyKey": "attempt_456"
}
```

### 2. User Runs Out of Energy
```typescript
// Option A: Wait for auto-refill (30 min per energy)
GET /energy  // Check when next refill happens

// Option B: Buy refill with diamonds
POST /energy/refill
{
  "amount": 5,
  "idempotencyKey": "refill_789"
}
```

### 3. User Purchases Diamonds
```typescript
// After successful payment verification
POST /diamonds/purchase
{
  "amount": 100,
  "receiptId": "stripe_ch_123",
  "provider": "stripe",
  "idempotencyKey": "purchase_101"
}
```

### 4. Admin Grants Currency
```typescript
// Grant diamonds
POST /diamonds/admin/grant
{
  "userId": 123,
  "amount": 50,
  "reason": "compensation"
}

// Grant energy
POST /energy/admin/grant
{
  "userId": 123,
  "amount": 5,
  "reason": "promotion"
}
```

---

## 💡 Pro Tips

1. **Always use idempotency keys** for critical operations (purchases, refills)
2. **Check transaction history** to debug currency issues
3. **Monitor auto-refill timing** - it's calculated on-demand, not via cron
4. **Test with different time scenarios** to verify refill logic
5. **Use database transactions** for any custom currency operations

---

## 🎓 Next Steps

1. ✅ Run migrations
2. ✅ Test all endpoints
3. ✅ Integrate with quiz gameplay
4. ✅ Add authentication
5. ✅ Implement payment provider
6. ✅ Deploy to production
7. ✅ Monitor and optimize

---

**Need help?** Check the full documentation in `ECONOMY_SYSTEM.md`
