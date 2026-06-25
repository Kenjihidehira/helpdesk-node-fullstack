const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, beforeEach, test } = require("node:test");
const { createServer } = require("../src/server");

let server;
let baseUrl;
let tempDir;

function listen(app) {
  return new Promise((resolve) => {
    app.listen(0, () => {
      const address = app.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  return { status: response.status, data };
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "helpdesk-node-"));
  server = createServer({
    dataFile: path.join(tempDir, "tickets.json"),
    publicDir: path.join(__dirname, "..", "public")
  });
  baseUrl = await listen(server);
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("responde health check", async () => {
  const response = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.data.status, "ok");
});

test("cria, lista e filtra chamados", async () => {
  const created = await request("/api/tickets", {
    method: "POST",
    body: JSON.stringify({
      customer: "Loja Horizonte",
      subject: "Falha ao confirmar pedido",
      priority: "urgente",
      assignee: "Wesley",
      channel: "chat",
      notes: "Pedido fica parado no pagamento."
    })
  });

  assert.equal(created.status, 201);
  assert.equal(created.data.data.customer, "Loja Horizonte");

  const urgent = await request("/api/tickets?priority=urgente");
  assert.equal(urgent.status, 200);
  assert.equal(urgent.data.data.length, 1);
});

test("atualiza status e gera estatísticas", async () => {
  const created = await request("/api/tickets", {
    method: "POST",
    body: JSON.stringify({
      customer: "Clube Azul",
      subject: "Usuário sem acesso ao painel"
    })
  });

  const id = created.data.data.id;
  const updated = await request(`/api/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "resolvido", priority: "alta" })
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.data.data.status, "resolvido");

  const stats = await request("/api/stats");
  assert.equal(stats.status, 200);
  assert.ok(stats.data.data.resolved >= 1);
});

test("remove chamados", async () => {
  const created = await request("/api/tickets", {
    method: "POST",
    body: JSON.stringify({
      customer: "Empresa Delta",
      subject: "Cancelar chamado temporário"
    })
  });

  const deleted = await request(`/api/tickets/${created.data.data.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.data.deleted, true);
});
