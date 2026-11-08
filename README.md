# Japan Places MCP Server

MCP server for the [Japan Places API](https://japan-places.local-connect-design.trade) —
municipality census for 1,917 municipalities (2020 census), POI category counts
for all 47 prefectures, station catchments, and 13 derived live signals for Japan.

## Install

```bash
npm install mcp-japan-places
npx mcp-japan-places
```

Or with a custom endpoint:

```bash
JAPAN_PLACES_BASE=https://japan-places.local-connect-design.trade npx mcp-japan-places
```

The server is zero-dependency (Node >= 18, stdio JSON-RPC) and holds no API
keys and no payment credentials.

## Tools

17 tools: one per dataset, plus health and the dataset catalogue.
Free tools return data directly. Paid tools are gated by the API with
HTTP 402 (x402 micropayments in USDC on Base, or a RapidAPI Premium Datasets
plan on PRO/ULTRA/MEGA); without payment a paid tool returns a clean,
labelled `PAID_DATASET` error explaining the price and the payment routes —
this server cannot pay on your behalf.

| Tool | Endpoint | Access |
|---|---|---|
| `jp_municipality` | `GET /api/v1/poi/municipality` | Free |
| `jp_quality` | `GET /api/v1/poi/quality` | Free |
| `jp_catchment` | `GET /api/v1/poi/catchment` | Paid, US$0.05/call |
| `jp_chains` | `GET /api/v1/poi/chains` | Paid, US$0.03/call |
| `jp_aliveness` | `GET /api/v1/poi/aliveness` | Paid, US$0.02/call |
| `jp_density` | `GET /api/v1/poi/density` | Paid, US$0.05/call |
| `jp_land_price` | `GET /api/v1/poi/land/price` | Paid, US$0.05/call |
| `jp_energy_price` | `GET /api/v1/signals/energy/price` | Paid, US$0.05/call |
| `jp_subsidy_award_rate` | `GET /api/v1/signals/subsidy/award-rate` | Paid, US$0.05/call |
| `jp_jma_weather` | `GET /api/v1/signals/jma/weather` | Paid, US$0.02/call |
| `jp_boj_statistics` | `GET /api/v1/signals/boj/statistics` | Paid, US$0.03/call |
| `jp_tourism_signal` | `GET /api/v1/signals/tourism` | Paid, US$0.02/call |
| `jp_crime_statistics` | `GET /api/v1/signals/crime` | Paid, US$0.02/call |
| `jp_facility_signal` | `GET /api/v1/signals/facility` | Paid, US$0.03/call |
| `jp_health` | `GET /api/v1/health` | Free |
| `jp_catalog` | `GET /api/v1/poi` | Free |
| `jp_history_diff` | `GET /api/v1/diff/{dataset}` | Paid, 402-gated (price in the API 402 response) |

Notes:

- `jp_municipality` requires `prefecture` (name such as `東京都` or the
  2-digit JIS X 0401 code such as `13`); the API answers 400 without it.
- `jp_catchment` currently covers a sample of 60 major stations
  (a full-station rollout is planned), per the API's own disclosure.
- `jp_history_diff` compares daily snapshots of a live dataset and returns
  added / removed / changed since a given date.

## Generated code — do not edit by hand

`src/index.js` is **generated** by `tools/generate_mcp.py` from the vendored
inputs in `tools/inputs/`:

- `openapi.json` — a snapshot of the **live** OpenAPI spec
  (`https://japan-places.local-connect-design.trade/api/v1/openapi`),
- `mcp-tools.json` — the tool canon of the site's own hosted MCP,
- `SPEC_SOURCE.json` — provenance of the snapshot (source, capture date,
  catalog hash).

```bash
npm run generate        # regenerate src/index.js + SYNC.json
npm test                # live smoke test against the real API
npm run check-drift     # compare the live spec against SYNC.json
```

`SYNC.json` records the spec source, the catalog hash this build was
generated from, and the tool/path coverage. Re-running the generator on an
unchanged spec produces a byte-identical tree.

### Drift watch (permanent sync loop)

`tools/check_drift.py` fetches the live `/api/v1/openapi`, and compares its
catalog hash and path set against `SYNC.json` (exit 0 = in sync, exit 2 =
drift, with a diff summary). A capture-fleet stream named `mcp_drift` runs
this checker daily on the sora fleet; a divergence lands in the fleet status
as a failure, which queues the follow-up work item: refresh
`tools/inputs/openapi.json` from the live spec, re-run the generator, run
the smoke test, and republish. That loop is what keeps this package matched
to the live API.

要約（日本語）: 本パッケージの `src/index.js` は生成物です。ライブAPIの
OpenAPI 仕様とサイト内蔵MCPのツール定義から `tools/generate_mcp.py` が
生成します。ライブ仕様とのずれは `tools/check_drift.py` が検出し、soraの
取得フリート（ストリーム `mcp_drift`、日次）が監視します。ずれたら
「仕様を取り直して再生成、スモークテスト、再公開」が作業項目になります。

## License

CDLA-Permissive-2.0 AND Apache-2.0

Data licenses: CDLA-Permissive-2.0, Apache-2.0, CC0-1.0, CC BY 2.0/4.0, PDL-1.0
Attribution: https://japan-places.local-connect-design.trade/jp-places/attribution.html

## Publisher

Lexus — https://github.com/lexusdev7
