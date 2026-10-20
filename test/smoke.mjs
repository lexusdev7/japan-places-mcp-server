import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "..", "src", "index.js");

let bad = 0;

function check(name, ok, detail = "") {
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
}

const child = spawn("node", [entry], { stdio: ["pipe", "pipe", "pipe"] });

let out = "";
let errOut = "";
child.stdout.on("data", (d) => { out += d.toString(); });
child.stderr.on("data", (d) => { errOut += d.toString(); });

function send(msg) {
  child.stdin.write(JSON.stringify(msg) + "\n");
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

try {
  await wait(1500);
  check("server starts", child.exitCode === null, child.exitCode !== null ? "exited " + child.exitCode : "");

  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {} } });
  await wait(500);
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  await wait(1000);
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "japan_places_health", arguments: {} } });
  await wait(1500);

  const lines = out.split("\n").filter((l) => l.trim());
  const messages = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  check("initialize response", messages.some((m) => m.id === 1 && m.result && m.result.serverInfo));

  const toolList = messages.find((m) => m.id === 2);
  const toolNames = toolList && toolList.result ? toolList.result.tools.map((t) => t.name) : [];
  check("tools/list has 4 tools", toolNames.length === 4, toolNames.join(", "));
  check("tools/list has poi", toolNames.includes("japan_places_poi"));
  check("tools/list has subsidies", toolNames.includes("japan_places_subsidies"));
  check("tools/list has jepx", toolNames.includes("japan_places_jepx"));
  check("tools/list has health", toolNames.includes("japan_places_health"));

  const healthCall = messages.find((m) => m.id === 3);
  const healthOk = healthCall && healthCall.result && healthCall.result.content;
  check("health tool returns data", Boolean(healthOk));
  if (healthOk) {
    const text = healthCall.result.content[0].text;
    const parsed = JSON.parse(text);
    check("health reports status ok", parsed.status === "ok", "status=" + parsed.status);
    check("health reports assets binding", parsed.assets_binding === true);
  }

  console.log("SMOKE bad=" + bad);
  child.kill();
  process.exit(bad ? 1 : 0);
} catch (err) {
  console.log("FAIL exception: " + String(err).slice(0, 200));
  child.kill();
  process.exit(1);
}