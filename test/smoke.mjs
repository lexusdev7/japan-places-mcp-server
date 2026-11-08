// Live smoke test for the generated Japan Places MCP server (v2).
// Spawns src/index.js over stdio and exercises every tool against the
// real API: free tools must return data, paid tools must return the
// clean labelled PAID_DATASET 402 error, and required-argument
// validation must fire client-side.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "..", "src", "index.js");

const EXPECTED_TOOLS = [
  "jp_municipality",
  "jp_quality",
  "jp_catchment",
  "jp_chains",
  "jp_aliveness",
  "jp_density",
  "jp_land_price",
  "jp_energy_price",
  "jp_subsidy_award_rate",
  "jp_jma_weather",
  "jp_boj_statistics",
  "jp_tourism_signal",
  "jp_crime_statistics",
  "jp_facility_signal",
  "jp_health",
  "jp_catalog",
  "jp_history_diff",
];

let bad = 0;
function check(name, ok, detail = "") {
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
}

const child = spawn("node", [entry], { stdio: ["pipe", "pipe", "pipe"] });
let buf = "";
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});
child.stderr.on("data", (d) => process.stderr.write(d));

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for id " + id)), 60000);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

async function callTool(name, args) {
  const res = await rpc("tools/call", { name, arguments: args });
  return res.result;
}

function textOf(result) {
  return result && result.content && result.content[0] ? result.content[0].text : "";
}

try {
  const init = await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {} });
  check("initialize serverInfo", Boolean(init.result && init.result.serverInfo));
  check(
    "server version is 2.0.0",
    init.result.serverInfo.version === "2.0.0",
    "version=" + (init.result.serverInfo && init.result.serverInfo.version)
  );

  const list = await rpc("tools/list");
  const names = list.result.tools.map((t) => t.name);
  check("tools/list has 17 tools", names.length === 17, names.join(", "));
  check(
    "tools/list matches expected set and order",
    JSON.stringify(names) === JSON.stringify(EXPECTED_TOOLS)
  );
  const paidLabelled = list.result.tools.filter((t) => t.description.includes("[Paid:"));
  const freeLabelled = list.result.tools.filter((t) => t.description.includes("[Free]"));
  check("13 paid tools labelled", paidLabelled.length === 13, String(paidLabelled.length));
  check("4 free tools labelled", freeLabelled.length === 4, String(freeLabelled.length));
  const muni = list.result.tools.find((t) => t.name === "jp_municipality");
  check(
    "jp_municipality requires prefecture",
    JSON.stringify(muni.inputSchema.required) === JSON.stringify(["prefecture"])
  );

  // Free tools must return data.
  const health = await callTool("jp_health", {});
  const healthJson = JSON.parse(textOf(health));
  check("jp_health returns status ok", healthJson.status === "ok", "status=" + healthJson.status);

  const catalog = await callTool("jp_catalog", {});
  const catalogJson = JSON.parse(textOf(catalog));
  check(
    "jp_catalog returns datasets",
    Array.isArray(catalogJson.datasets) && catalogJson.datasets.length >= 14,
    "datasets=" + (catalogJson.datasets || []).length
  );

  const muniRes = await callTool("jp_municipality", { prefecture: "13" });
  const muniJson = JSON.parse(textOf(muniRes));
  check(
    "jp_municipality returns census data",
    Boolean(muniJson.dataset) && Array.isArray(muniJson.municipalities),
    "dataset=" + muniJson.dataset
  );

  const quality = await callTool("jp_quality", {});
  const qualityJson = JSON.parse(textOf(quality));
  check("jp_quality returns distribution", typeof qualityJson.mean === "number", "mean=" + qualityJson.mean);

  // Client-side required-argument validation.
  const noArg = await callTool("jp_municipality", {});
  check(
    "jp_municipality without prefecture is a clean error",
    noArg.isError === true && textOf(noArg).includes("prefecture"),
    textOf(noArg).slice(0, 80)
  );

  // Paid tools must return the clean labelled 402 error.
  const paidCalls = [
    ["jp_catchment", {}],
    ["jp_chains", {}],
    ["jp_aliveness", {}],
    ["jp_density", {}],
    ["jp_land_price", { prefecture_code: "13000" }],
    ["jp_energy_price", { area: "tokyo" }],
    ["jp_subsidy_award_rate", { industry: "manufacturing", prefecture: "13" }],
    ["jp_jma_weather", { prefecture: "13" }],
    ["jp_boj_statistics", { series: "FM08" }],
    ["jp_tourism_signal", { prefecture: "13" }],
    ["jp_crime_statistics", { prefecture: "13" }],
    ["jp_facility_signal", { prefecture: "13" }],
    ["jp_history_diff", { dataset: "energy_price", since: "2026-11-01" }],
  ];
  for (const [name, args] of paidCalls) {
    const res = await callTool(name, args);
    const text = textOf(res);
    check(
      name + " returns labelled PAID_DATASET 402",
      res.isError === true && text.startsWith("PAID_DATASET:") && text.includes("HTTP 402"),
      text.slice(0, 100)
    );
  }

  console.log("SMOKE bad=" + bad);
  child.kill();
  process.exit(bad ? 1 : 0);
} catch (err) {
  console.log("FAIL exception: " + String(err).slice(0, 300));
  child.kill();
  process.exit(1);
}
