import { Pool } from 'pg';

/** Optional index for operator ingestion tooling; immutable packs remain the client source of truth. */
export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  return {
    async health() {
      const result = await pool.query('SELECT 1 AS ready');
      return result.rows[0]?.ready === 1;
    },
    async nearbySources(longitude: number, latitude: number, radiusM: number) {
      const result = await pool.query(
        `SELECT id, source_id, kind, properties, ST_AsGeoJSON(geometry)::json AS geometry
         FROM nautical_features WHERE ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint($1, $2),4326)::geography, $3)
         ORDER BY id LIMIT 10000`,
        [longitude, latitude, radiusM],
      );
      return result.rows;
    },
    close: () => pool.end(),
  };
}
