-- This creates the spatial index
CREATE INDEX geocache_location_idx
    ON "Geocache"
    USING gist (location);
