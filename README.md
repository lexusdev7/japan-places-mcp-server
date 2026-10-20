# Japan Places MCP Server

MCP server for the [Japan Places API](https://japan-places.local-connect-design.trade) —
2,629,417 Japanese facility records with five derived business-signal datasets.

## Install

```bash
npm install @modelcontextprotocol/server-japan-places
npx @modelcontextprotocol/server-japan-places
```

Or with a custom endpoint:

```bash
JAPAN_PLACES_BASE=https://japan-places.local-connect-design.trade npx @modelcontextprotocol/server-japan-places
```

## Tools

| Tool | Endpoint | Free |
|---|---|---|
| `japan_places_poi` | `/api/v1/poi/{dataset}` | municipality, quality, aliveness |
| `japan_places_subsidies` | `/api/v1/subsidies` | yes |
| `japan_places_jepx` | `/api/v1/jepx` | yes |
| `japan_places_health` | `/api/v1/health` | yes |

## Datasets

| Dataset | Description |
|---|---|
| `municipality` | POI counts by prefecture x 16 categories |
| `quality` | Geocode quality scores (0-100, mean 84.9) |
| `aliveness` | Open/closed probability (0-100) |
| `catchment` | Facility density within 500m of 1,917 stations |
| `chains` | Chain store index (16,964 chains detected) |

## Example

```bash
curl "https://japan-places.local-connect-design.trade/api/v1/poi/municipality?prefecture=tokyo"
```

## License

CDLA-Permissive-2.0 AND Apache-2.0

Data licenses: CDLA-Permissive-2.0, Apache-2.0, CC0-1.0, CC BY 2.0/4.0, PDL-1.0
Attribution: https://japan-places.local-connect-design.trade/jp-places/attribution.html

## Publisher

Lexus — https://github.com/lexusdev7
