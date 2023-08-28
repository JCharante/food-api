-- CreateTable
CREATE TABLE "UserVerifyRequest" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "vonageRequestId" TEXT NOT NULL,

    CONSTRAINT "UserVerifyRequest_pkey" PRIMARY KEY ("id")
);
