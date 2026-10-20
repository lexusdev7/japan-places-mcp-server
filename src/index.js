#!/usr/bin/env node
/**
 * Japan Places MCP Server
 *
 * Zero-dependency MCP server for the Japan Places API.
 * Implements the MCP JSON-RPC protocol directly over stdio.
 *
 * Publisher: Lexus
 * License: CDLA-Permissive-2.0 AND Apache-2.0
 */

const BASE = process.env.JAPAN_PLACES_BASE || "https://japan-places.local-connect-design.trade";

async function callApi(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

const TOOLS = [
  {
    name: "japan_places_poi",
    description: "Query a POI dataset from 2.63M Japanese facilities (municipality, quality, aliveness, catchment, chains).",
    inputSchema: {
      type: "object",
      properties: {
        dataset: { type: "string", enum: ["municipality", "quality", "aliveness", "catchment", "chains"] },
        prefecture: { type: "string" },
        min_score: { type: "number" },
        limit: { type: "number" },
      },
      required: ["dataset"],
    },
  },
  {
    name: "japan_places_subsidies",
    description: "J-Grants subsidies from the official Digital Agency API (183 items).",
    inputSchema: {
      type: "object",
      properties: {
        area: { type: "string" },
        min_limit: { type: "number" },
      },
    },
  },
  {
    name: "japan_places_jepx",
    description: "JEPX electricity spot prices (366 daily rows).",
    inputSchema: {
      type: "object",
      properties: { date: { type: "string" } },
    },
  },
  {
    name: "japan_places_health",
    description: "Service health and signal load status.",
    inputSchema: { type: "object", properties: {} },
  },
];

const SERVER_INFO = { name: "japan-places", version: "1.0.0" };

async function callTool(name, args) {
  switch (name) {
    case "japan_places_poi":
      return callApi(`/api/v1/poi/${args.dataset}`, {
        prefecture: args.prefecture,
        min_score: args.min_score,
        limit: args.limit,
      });
    case "japan_places_subsidies":
      return callApi("/api/v1/subsidies", { area: args.area, min_limit: args.min_limit });
    case "japan_places_jepx":
      return callApi("/api/v1/jepx", { date: args.date });
    case "japan_places_health":
      return callApi("/api/v1/health");
    default:
      throw new Error("unknown tool: " + name);
  }
}

function reply(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n";
}

function error(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n";
}

let buf = "";
process.stdin.on("data", async (chunk) => {
  buf += chunk.toString("utf-8");
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      process.stdout.write(error(null, -32700, "parse error"));
      continue;
    }
    const { id, method, params } = msg;
    try {
      if (method === "initialize") {
        process.stdout.write(reply(id, { protocolVersion: "2024-11-05", serverInfo: SERVER_INFO, capabilities: { tools: {} } }));
      } else if (method === "tools/list") {
        process.stdout.write(reply(id, { tools: TOOLS }));
      } else if (method === "tools/call") {
        const result = await callTool(params.name, params.arguments || {});
        process.stdout.write(reply(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }));
      } else if (method === "ping") {
        process.stdout.write(reply(id, {}));
      } else if (method && method.startsWith("notifications/")) {
      } else {
        process.stdout.write(error(id, -32601, "method not found: " + method));
      }
    } catch (err) {
      process.stdout.write(error(id, -32603, err && err.message ? err.message : String(err)));
    }
  }
});