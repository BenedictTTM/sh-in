-- CreateTable
CREATE TABLE "user_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "day_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),
    "top_3_finishes" INTEGER NOT NULL DEFAULT 0,
    "total_study_time_seconds" BIGINT NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 5,
    "max_energy" INTEGER NOT NULL DEFAULT 5,
    "last_energy_refill_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "activity_date" DATE NOT NULL,
    "study_seconds" INTEGER NOT NULL DEFAULT 0,
    "quizzes_solved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" VARCHAR(255),
    "metadata" JSONB,
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- CreateIndex
CREATE INDEX "user_stats_user_id_idx" ON "user_stats"("user_id");

-- CreateIndex
CREATE INDEX "user_activity_logs_user_id_idx" ON "user_activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_activity_logs_activity_date_idx" ON "user_activity_logs"("activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_logs_user_id_activity_date_key" ON "user_activity_logs"("user_id", "activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "currency_transactions_idempotency_key_key" ON "currency_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "currency_transactions_user_id_idx" ON "currency_transactions"("user_id");

-- CreateIndex
CREATE INDEX "currency_transactions_type_idx" ON "currency_transactions"("type");

-- CreateIndex
CREATE INDEX "currency_transactions_currency_idx" ON "currency_transactions"("currency");

-- CreateIndex
CREATE INDEX "currency_transactions_created_at_idx" ON "currency_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
