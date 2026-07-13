import assert from "node:assert/strict";
import { createServer } from "../src/server.js";
import { loadSeed } from "../src/storage.js";

const server = await createServer(await loadSeed());
await new Promise((resolve) => server.listen(0, resolve));
const baseUrl = "http://127.0.0.1:" + server.address().port;

try {
  const html = await fetch(baseUrl + "/").then((response) => response.text());
  const css = await fetch(baseUrl + "/style.css").then((response) => response.text());
  const api = await fetch(baseUrl + "/api/dashboard").then((response) => response.json());

  assert.match(html, /Controle o risco de SLA/);
  assert.match(css, /kpi-grid/);
  assert.equal(api.kpis.openTickets, 4);
  assert.ok(api.queue.length >= 4);
  console.log("smoke ok");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
