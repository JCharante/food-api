-- CreateTable
CREATE TABLE "Geocache" (
    "id" SERIAL NOT NULL,
    "location" Geometry NOT NULL,
    "results" JSONB NOT NULL DEFAULT '[]',
    "insertedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Geocache_pkey" PRIMARY KEY ("id")
);
