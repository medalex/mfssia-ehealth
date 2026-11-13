# MFSSIA DKG client to interact with DKG node  🛡️

# Tools

- NestJS
- Swagger

## Getting Started

The easiest way to get started is to clone the repository:

# clone the repository

```
git clone https://medalex@bitbucket.org/alexnorta/dkg6_client_js.git
```

# Install NPM dependencies

```
npm install --legacy-peer-deps
```

```
npm run build
```

# start the server

```
npm run start
```
## Docker run
To build a docker container use the Docker file in the root folder with the command `docker build -t dkg-client .`

To run the image use command `docker run --rm -p 3000:3000 -it dkg-client`

## DKG V10

All DKG access goes through `src/providers/dkg/dkg.service.ts`, on an OriginTrail DKG V10 node
(`@origintrail-official/dkg@10.0.27`) over its HTTP API.

### Local node

The node runs in Docker from the `dkg-node` repository, folder `dkg-v10-local`, without a blockchain
(mock chain). API on http://localhost:9200:

```
cd dkg-node/dkg-v10-local
docker compose up --build -d
```

### Configuration

| Variable | Default | |
|---|---|---|
| `DKG_V10_URL` | `http://localhost:9200` | node API |
| `DKG_V10_TOKEN` | — (required) | API token: the last line of `dkg-v10-local/data/auth.token` (the first line is a comment) |
| `DKG_CONTEXT_GRAPH` | `mfssia-ehealth` | the one context graph all data goes into; created on first use |
| `DKG_WRITE_MODE` | `draft` | `draft`: Working Memory only. `publish` (on-chain) is not implemented and refused at startup |

```
DKG_V10_TOKEN=$(grep -v "^#" ../dkg-node/dkg-v10-local/data/auth.token | tr -d "[:space:]")
```

### How data is stored

- Every `createAsset` / `publishAttestation` / `publishRdf` writes one knowledge asset (KA) as a
  Working Memory draft. Nothing is anchored on a blockchain.
- KA name: the `@id` plus a 12-character hash of the canonical content
  (`src/providers/dkg/knowledge-asset-naming.ts`). The same content again is skipped; changed content
  under the same `@id` becomes a new KA next to the old one.
- UAL: `did:dkg:context-graph:<context graph>/<KA name>`.
- JSON-LD is converted to quads as dkg.js 8 did (URDNA2015, safe mode, blank nodes as `uuid:` IRIs);
  the remote contexts schema.org and did/v1 are served from local copies, never fetched.

### Local run

Postgres from `docker-compose.local.yml` (migrations run at startup), then the backend:

```
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres
DKG_V10_TOKEN=... \
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mfssia?sslmode=disable" \
DATABASE_MIGRATIONS_RUN=true \
PILOT_DEMO_SEED=true EVIDENCE_REFERENCE_TIME=2026-10-10T00:00:00Z \
node dist/src/main.js
```

The seeds check the DKG before writing, so restarting the backend adds nothing.

### Known gaps

- No on-chain anchoring: KAs stay in the node's Working Memory; `DKG_WRITE_MODE=publish` is not
  implemented.
- The node's store rewrites literals to canonical form: `measuredAt` comes back as
  `2026-09-10T00:00:00Z`, not `2026-09-10T00:00:00.000Z`; decimals lose trailing zeros (`55.0` → `55`).
- `lab-record` builds its tree in SPARQL row order (no `ORDER BY`), so a patient's root depends on the
  order the store returns the measurements in.
- The node limits API requests per IP (default 120/min); `dkg-v10-local` raises it to 6000/min. A
  remote node needs the same.
- New data under an existing `@id` is added as a new KA; merging or versioning is not designed yet
  (`knowledge-asset-naming.ts`).
- `queryAttestations` uses the `mfssia:` prefix without declaring it; it has no callers.
- Without the EVM service (`EVM_URL`), `GovernanceSyncService` logs an error at startup and
  rx-governance endpoints wait several seconds for it.

## Ontology

- `ontology/review-signal.ttl`: review signal ontology (`rs:`), extends `rx-prescription-full.ttl` (`rx:`), which extends the MFSSIA ontology
- `ontology/review-signal-shapes.ttl`: SHACL constraints derived from requirements R1–R4
- `ontology/tests/`: an example signal from the running case and `validate.py`, which checks that each constraint detects its violation

To run the tests:

```
pip install rdflib pyshacl && python3 ontology/tests/validate.py
```

## Links

- Swagger: http://localhost:4000/docs