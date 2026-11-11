# Local container stack

From the repository root, install npm dependencies to create the lockfile, set a local database password, and run:

```sh
export POSTGRES_PASSWORD='choose-a-local-development-password'
docker compose -f infra/compose.yaml up --build
```

The API is on port 3001. PostGIS stays inside the Compose network. `001-schema.sql` initializes provenance, raw geometry, pack manifests and curated places on the first database creation. Never expose the database or use this example password in deployment. Set `NWS_USER_AGENT` to your deployment name and real contact address.

The API's immutable pack volume is mounted read-only. Operator ingestion uses the same volume through the `tools` profile:

```sh
docker compose -f infra/compose.yaml --profile tools run --rm ingest build /data/incoming/recipe.json --root /data/packs
```

Create an operator recipe and mount its real sources under `infra/incoming`, referenced from `/data/incoming`; no regional data is bundled. The worker rejects synthetic packs and mixed or unclassified source provenance before publication. Test fixtures are excluded from its container image. `index-postgis` connects to the internal database through its configured environment. Optional tippecanoe display tiles are not installed by the minimal image; use an operator image containing that CLI when requested.

Containers do not bypass maritime review or on-water release gates. There is no enabled ChatGPT integration, booking/payment service or automatic route generation. The API starts with an empty published-region catalog and supports real-source discovery independently of complete reviewed nautical packs.
