-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" VARCHAR(20) NOT NULL DEFAULT 'EASY';
