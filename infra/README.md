# Local container stack

For a new database, set a local database password and run these commands from the repository root. Follow the migration steps below first if you have an existing Compose database.

```sh
export POSTGRES_PASSWORD='choose-a-local-development-password'
docker compose -f infra/compose.yaml up --build
```

The development API listens on `127.0.0.1:3001`. PostGIS stays inside the Compose network. `001-schema.sql` initializes provenance, raw geometry, pack manifests and curated places on the first database creation. Set `NWS_USER_AGENT` to your deployment name and real contact address.

Use `docker compose -f infra/compose.yaml build --pull --no-cache` to refresh distribution packages when rebuilding. Update pinned base image versions or digests when their maintainers publish fixes. Add `--profile tools` before `build` to include the ingest image.

## Migrate an existing Compose database

The database image includes PostgreSQL 17.12 and PostGIS 3.7.0. The image changes Debian and glibc versions, so restoring a logical dump into a fresh data directory is required to rebuild indexes under the new collation. The stack uses a separate `postgres_trixie` volume. Keep the previous `postgres` volume and a verified full logical backup until the restore has been validated. [PostGIS image upgrade notes](https://github.com/postgis/docker-postgis#postgispostgis)

1. Pause database writes and use `pg_dump --format=custom` to make a full backup of the old `anchorbuddy` database.
2. Check `pg_extension` for `postgis_tiger_geocoder`, `address_standardizer`, and `address_standardizer_data_us`. The old image may have installed these automatically. If present, restore or clone the old database into a disposable database on the old image. Remove only confirmed-unused extensions from that copy with `DROP EXTENSION` and create a new dump. If objects depend on an extension, resolve that dependency before migrating. Preserve the original backup.
3. Start the new database service with its fresh volume. Connect to `postgres` and rename the freshly initialized `anchorbuddy` database so its pre-created tables cannot conflict with the restore. Create a new empty `anchorbuddy` database from `template0`, then restore the compatible dump with `pg_restore --exit-on-error --dbname=anchorbuddy`. Compare row counts and run the application's spatial queries before resuming writes.

## Operator ingestion

The API's immutable pack volume is mounted read-only. Operator ingestion uses the same volume through the `tools` profile:

```sh
docker compose -f infra/compose.yaml --profile tools run --rm ingest build /data/incoming/recipe.json --root /data/packs
```

Create an operator recipe and mount its real sources under `infra/incoming`, referenced from `/data/incoming`; no regional data is bundled. The worker rejects synthetic packs and mixed or unclassified source provenance before publication. Test fixtures are excluded from its container image. `index-postgis` connects to the internal database through its configured environment. Optional tippecanoe display tiles are not installed by the minimal image; use an operator image containing that CLI when requested.

Containers do not bypass maritime review or on-water release gates. There is no enabled ChatGPT integration, booking/payment service or automatic route generation. The API starts with an empty published-region catalog and supports real-source discovery independently of complete reviewed nautical packs.
