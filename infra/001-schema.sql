CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS source_snapshots (
  id text PRIMARY KEY,
  provider_id text NOT NULL,
  source_url text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  valid_until timestamptz,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  provenance jsonb NOT NULL,
  review_status text NOT NULL DEFAULT 'review-required' CHECK (review_status IN ('review-required','reviewed','rejected'))
);

CREATE TABLE IF NOT EXISTS nautical_features (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES source_snapshots(id),
  kind text NOT NULL,
  geometry geometry NOT NULL,
  depth_lower_m double precision,
  depth_upper_m double precision,
  vertical_datum text,
  properties jsonb NOT NULL,
  CHECK (ST_IsValid(geometry)),
  CHECK (ST_SRID(geometry) = 4326),
  CHECK (depth_lower_m IS NULL OR depth_upper_m IS NULL OR depth_lower_m <= depth_upper_m)
);
CREATE INDEX IF NOT EXISTS nautical_features_geometry_idx ON nautical_features USING gist (geometry);
CREATE INDEX IF NOT EXISTS nautical_features_geography_idx ON nautical_features USING gist ((geometry::geography));
CREATE INDEX IF NOT EXISTS nautical_features_source_idx ON nautical_features (source_id);

CREATE TABLE IF NOT EXISTS regional_packs (
  region_id text NOT NULL,
  version text NOT NULL,
  manifest jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  PRIMARY KEY (region_id, version)
);

CREATE TABLE IF NOT EXISTS curated_places (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES source_snapshots(id),
  geometry geometry(Point,4326) NOT NULL,
  details jsonb NOT NULL,
  tariff_rules jsonb,
  verified_at timestamptz NOT NULL,
  valid_until timestamptz NOT NULL
);
