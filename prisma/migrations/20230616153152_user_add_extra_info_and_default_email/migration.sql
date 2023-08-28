-- AlterTable
ALTER TABLE "User" ADD COLUMN     "extraInfo" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "email" SET DEFAULT '';
