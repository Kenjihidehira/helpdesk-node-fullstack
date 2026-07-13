import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";
import { loadSeed } from "../src/storage.js";

async function withServer(callback) {
  const server = await createServer(await loadSeed());
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  try {
    await callback("http://127.0.0.1:" + port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/dashboard returns queue and KPIs", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl + "/api/dashboard");
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.ok(payload.queue.length >= 4);
    assert.equal(payload.kpis.automationReady, 3);
  });
});

test("POST /api/tickets validates and creates a ticket", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl + "/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: "New billing portal issue",
        customerId: "cust-102",
        priority: "high",
        category: "billing"
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 201);
    assert.equal(payload.customer.name, "Bright Clinics");
    assert.equal(payload.status, "open");
  });
});

test("POST /api/tickets/:id/replies records first response", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl + "/api/tickets/TCK-2401/replies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author: "agent", body: "We are on it." })
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.sla.firstResponseMinutes, 50);
  });
});
