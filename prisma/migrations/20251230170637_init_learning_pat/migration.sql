-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "solution" TEXT;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "difficulty" VARCHAR(20) NOT NULL DEFAULT 'easy',
ADD COLUMN     "subject" VARCHAR(50) NOT NULL DEFAULT 'random';

-- AlterTable
ALTER TABLE "user_stats" ADD COLUMN     "current_level" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_picture" TEXT,
ADD COLUMN     "school" VARCHAR(255);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "image_src" TEXT,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'SELECT',
    "question" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_options" (
    "id" SERIAL NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "image_src" TEXT,
    "audio_src" TEXT,

    CONSTRAINT "challenge_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress_learning" (
    "user_id" INTEGER NOT NULL,
    "active_course_id" INTEGER,
    "hearts" INTEGER NOT NULL DEFAULT 5,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_learning_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "units_course_id_idx" ON "units"("course_id");

-- CreateIndex
CREATE INDEX "units_order_idx" ON "units"("order");

-- CreateIndex
CREATE INDEX "lessons_unit_id_idx" ON "lessons"("unit_id");

-- CreateIndex
CREATE INDEX "lessons_order_idx" ON "lessons"("order");

-- CreateIndex
CREATE INDEX "challenges_lesson_id_idx" ON "challenges"("lesson_id");

-- CreateIndex
CREATE INDEX "challenges_order_idx" ON "challenges"("order");

-- CreateIndex
CREATE INDEX "challenge_options_challenge_id_idx" ON "challenge_options"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_progress_user_id_idx" ON "challenge_progress"("user_id");

-- CreateIndex
CREATE INDEX "challenge_progress_challenge_id_idx" ON "challenge_progress"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_progress_user_id_challenge_id_key" ON "challenge_progress"("user_id", "challenge_id");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_options" ADD CONSTRAINT "challenge_options_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress_learning" ADD CONSTRAINT "user_progress_learning_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress_learning" ADD CONSTRAINT "user_progress_learning_active_course_id_fkey" FOREIGN KEY ("active_course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
