/*
  Warnings:

  - The primary key for the `UserVerifyRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `UserVerifyRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserVerifyRequest" DROP CONSTRAINT "UserVerifyRequest_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "UserVerifyRequest_pkey" PRIMARY KEY ("vonageRequestId");
