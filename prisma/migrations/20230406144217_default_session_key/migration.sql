/*
  Warnings:

  - Added the required column `owningRestaurantID` to the `Menu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "owningRestaurantID" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_owningRestaurantID_fkey" FOREIGN KEY ("owningRestaurantID") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
