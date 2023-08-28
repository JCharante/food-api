-- CreateIndex
CREATE INDEX "Geocache_location_idx" ON "Geocache" USING GIST ("location");
