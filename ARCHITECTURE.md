# Economy System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUIZ APP ECONOMY                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│     ENERGY       │         │    DIAMONDS      │
│  (Regenerating)  │         │    (Premium)     │
└──────────────────┘         └──────────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌──────────────────────────────────────────────┐
│           UserStats (Database)                │
│  ┌────────────────────────────────────────┐  │
│  │ energy: 5                              │  │
│  │ maxEnergy: 5                           │  │
│  │ diamonds: 100                          │  │
│  │ lastEnergyRefillAt: 2025-12-06...     │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│      CurrencyTransaction (Audit Log)          │
│  ┌────────────────────────────────────────┐  │
│  │ type: energy_consume                   │  │
│  │ currency: energy                       │  │
│  │ amount: -1                             │  │
│  │ balanceBefore: 5                       │  │
│  │ balanceAfter: 4                        │  │
│  │ reason: quiz_play                      │  │
│  │ metadata: { quizId: 123 }             │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Energy Flow

```
┌─────────────┐
│   User      │
│  (5/5 ⚡)   │
└──────┬──────┘
       │
       │ Plays Quiz
       ▼
┌─────────────────────────┐
│  POST /energy/consume   │
│  { amount: 1 }          │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  EnergyService          │
│  - Check balance        │
│  - Deduct energy        │
│  - Log transaction      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│   User      │
│  (4/5 ⚡)   │
└──────┬──────┘
       │
       │ Wait 30 minutes
       ▼
┌─────────────────────────┐
│  GET /energy            │
│  Auto-refill triggered  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│   User      │
│  (5/5 ⚡)   │
└─────────────┘
```

## Diamond to Energy Flow

```
┌─────────────────┐
│   User          │
│  100 💎, 0/5 ⚡ │
└────────┬────────┘
         │
         │ Wants to refill energy
         ▼
┌────────────────────────┐
│ POST /energy/refill    │
│ { amount: 5 }          │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────────────┐
│  EnergyService                 │
│  - Check diamond balance       │
│  - Calculate cost (5 × 10)     │
│  - Deduct 50 diamonds          │
│  - Add 5 energy                │
│  - Log 2 transactions          │
└────────┬───────────────────────┘
         │
         ▼
┌─────────────────┐
│   User          │
│  50 💎, 5/5 ⚡  │
└─────────────────┘
```

## Purchase Flow

```
┌─────────────┐
│   User      │
│   0 💎      │
└──────┬──────┘
       │
       │ Initiates IAP
       ▼
┌──────────────────────┐
│  Payment Provider    │
│  (Stripe/Apple/etc)  │
└──────┬───────────────┘
       │
       │ Payment Success
       ▼
┌──────────────────────────┐
│ POST /diamonds/purchase  │
│ {                        │
│   amount: 100,           │
│   receiptId: "tx_123",   │
│   provider: "stripe"     │
│ }                        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  DiamondsService         │
│  - Verify receipt        │
│  - Check idempotency     │
│  - Add diamonds          │
│  - Log transaction       │
└──────┬───────────────────┘
       │
       ▼
┌─────────────┐
│   User      │
│  100 💎     │
└─────────────┘
```

## Module Dependencies

```
┌─────────────────────────────────────────┐
│           AppModule                      │
│  ┌───────────────────────────────────┐  │
│  │  EnergyModule                     │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ EnergyController            │  │  │
│  │  │ EnergyService               │  │  │
│  │  │ DTOs: Consume, Refill, etc. │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  DiamondsModule                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ DiamondsController          │  │  │
│  │  │ DiamondsService             │  │  │
│  │  │ DTOs: Purchase, Spend, etc. │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  PrismaService                    │  │
│  │  (Shared Database Access)         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Transaction Logging

```
Every currency operation creates a transaction record:

┌─────────────────────────────────────────────┐
│  CurrencyTransaction                         │
├─────────────────────────────────────────────┤
│  id: 1                                       │
│  userId: 123                                 │
│  type: "energy_consume"                      │
│  currency: "energy"                          │
│  amount: -1                                  │
│  balanceBefore: 5                            │
│  balanceAfter: 4                             │
│  reason: "quiz_play"                         │
│  metadata: { "quizId": 456 }                │
│  idempotencyKey: "attempt_789"              │
│  createdAt: "2025-12-06T21:30:00Z"          │
└─────────────────────────────────────────────┘

Benefits:
✅ Complete audit trail
✅ Debugging currency issues
✅ Fraud detection
✅ Analytics and reporting
✅ Compliance and accountability
```

## Idempotency Protection

```
Request 1 (Original):
POST /diamonds/purchase
{
  "amount": 100,
  "receiptId": "tx_123",
  "idempotencyKey": "purchase_abc"
}
→ Success: Diamonds added, transaction logged

Request 2 (Duplicate):
POST /diamonds/purchase
{
  "amount": 100,
  "receiptId": "tx_123",
  "idempotencyKey": "purchase_abc"  ← Same key!
}
→ Error 409: "Transaction already processed"
→ No duplicate charge!

Benefits:
✅ Prevents double-charging
✅ Safe retries on network errors
✅ Consistent state
```

## Auto-Refill Calculation

```
User has 2/5 energy
Last refill: 2025-12-06 20:00:00
Current time: 2025-12-06 21:35:00

Calculation:
1. Time elapsed = 95 minutes
2. Refills = floor(95 / 30) = 3
3. Energy to add = 3 × 1 = 3
4. New energy = min(5, 2 + 3) = 5
5. New refill time = 20:00:00 + (3 × 30min) = 21:30:00

Result: User now has 5/5 energy
Next refill: 22:00:00 (if they use energy)
```

## Error Handling Flow

```
POST /energy/consume { amount: 1 }
           │
           ▼
    Check idempotency
           │
    ┌──────┴──────┐
    │             │
Duplicate?    New request
    │             │
    ▼             ▼
Return 409   Check balance
                  │
           ┌──────┴──────┐
           │             │
    Sufficient?    Insufficient?
           │             │
           ▼             ▼
    Process OK    Return 400
           │
           ▼
    DB Transaction
           │
    ┌──────┴──────┐
    │             │
 Success?      Failure?
    │             │
    ▼             ▼
Return 200   Rollback + 500
```

## Security Layers

```
┌────────────────────────────────────┐
│  1. API Gateway / Load Balancer    │
│     - Rate limiting                 │
│     - DDoS protection              │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  2. Authentication Middleware       │
│     - JWT validation               │
│     - User identification          │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  3. Authorization Guards            │
│     - Role-based access            │
│     - Admin checks                 │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  4. Input Validation (DTOs)         │
│     - Type checking                │
│     - Range validation             │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  5. Business Logic                  │
│     - Balance checks               │
│     - Idempotency                  │
│     - Transaction atomicity        │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  6. Database Layer                  │
│     - ACID transactions            │
│     - Constraints                  │
│     - Audit logging                │
└────────────────────────────────────┘
```
