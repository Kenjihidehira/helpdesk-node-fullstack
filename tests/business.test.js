import test from "node:test";
import assert from "node:assert/strict";
import { loadSeed } from "../src/storage.js";
import { buildAutomationPlan, getDashboard, listTickets, runAutomation } from "../src/helpdeskService.js";

test("dashboard exposes SLA KPIs and risk-ranked queue", async () => {
  const data = await loadSeed();
  const dashboard = getDashboard(data);

  assert.equal(dashboard.kpis.openTickets, 4);
  assert.equal(dashboard.kpis.breached, 2);
  assert.equal(dashboard.queue[0].priority, "urgent");
  assert.ok(dashboard.kpis.revenueAtRisk > 30000);
});

test("ticket filters return matching records", async () => {
  const data = await loadSeed();
  const urgent = listTickets(data, { priority: "urgent" });

  assert.equal(urgent.length, 2);
  assert.ok(urgent.every((ticket) => ticket.priority === "urgent"));
});

test("automation assigns and tags risky tickets", async () => {
  const data = await loadSeed();
  const before = buildAutomationPlan(data);
  const result = runAutomation(data);

  assert.ok(before.some((action) => action.type === "assignment"));
  assert.ok(result.actions.length >= 3);
  assert.ok(data.tickets.find((ticket) => ticket.id === "TCK-2404").assignedTo);
});
