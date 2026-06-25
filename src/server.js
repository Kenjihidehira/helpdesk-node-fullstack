const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { TicketStorage } = require("./storage");

const defaultDataFile = path.join(process.cwd(), "data", "tickets.json");
const defaultPublicDir = path.join(__dirname, "..", "public");
const allowedStatuses = ["aberto", "andamento", "resolvido"];
const allowedPriorities = ["baixa", "media", "alta", "urgente"];

function json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function getMime(filePath) {
  const extension = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };
  return types[extension] || "application/octet-stream";
}

async function body(request) {
  return new Promise((resolve, reject) => {
    let data = "";

    request.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload muito grande."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
  });
}

function validateTicket(data, partial = false) {
  if (!partial || data.customer !== undefined) {
    if (!data.customer || String(data.customer).trim().length < 3) {
      return "Informe um cliente com pelo menos 3 caracteres.";
    }
  }

  if (!partial || data.subject !== undefined) {
    if (!data.subject || String(data.subject).trim().length < 5) {
      return "Informe um assunto com pelo menos 5 caracteres.";
    }
  }

  if (data.status && !allowedStatuses.includes(data.status)) {
    return "Status inválido.";
  }

  if (data.priority && !allowedPriorities.includes(data.priority)) {
    return "Prioridade inválida.";
  }

  return null;
}

function filterTickets(tickets, searchParams) {
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search")?.trim().toLowerCase();

  return tickets.filter((ticket) => {
    const searchable = `${ticket.customer} ${ticket.subject} ${ticket.assignee} ${ticket.channel}`.toLowerCase();
    return (!status || ticket.status === status)
      && (!priority || ticket.priority === priority)
      && (!search || searchable.includes(search));
  });
}

function calculateStats(tickets) {
  const byStatus = Object.fromEntries(allowedStatuses.map((status) => [status, 0]));
  const byPriority = Object.fromEntries(allowedPriorities.map((priority) => [priority, 0]));

  tickets.forEach((ticket) => {
    byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
    byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
  });

  return {
    total: tickets.length,
    open: byStatus.aberto,
    inProgress: byStatus.andamento,
    resolved: byStatus.resolvido,
    critical: byPriority.urgente + byPriority.alta,
    byStatus,
    byPriority
  };
}

async function serveStatic(response, url, publicDir) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    json(response, 403, { error: "Acesso negado." });
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": getMime(filePath) });
    response.end(file);
  } catch {
    json(response, 404, { error: "Arquivo não encontrado." });
  }
}

function createServer(options = {}) {
  const storage = new TicketStorage(options.dataFile || defaultDataFile);
  const publicDir = options.publicDir || defaultPublicDir;

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const segments = url.pathname.split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
      json(response, 204, {});
      return;
    }

    try {
      if (url.pathname.startsWith("/api/")) {
        if (request.method === "GET" && url.pathname === "/api/health") {
          json(response, 200, { status: "ok", service: "helpdesk-node-fullstack" });
          return;
        }

        if (request.method === "GET" && url.pathname === "/api/tickets") {
          const tickets = await storage.all();
          json(response, 200, { data: filterTickets(tickets, url.searchParams) });
          return;
        }

        if (request.method === "GET" && url.pathname === "/api/stats") {
          const tickets = await storage.all();
          json(response, 200, { data: calculateStats(tickets) });
          return;
        }

        if (request.method === "POST" && url.pathname === "/api/tickets") {
          const payload = await body(request);
          const error = validateTicket(payload);

          if (error) {
            json(response, 422, { error });
            return;
          }

          const ticket = await storage.create(payload);
          json(response, 201, { data: ticket });
          return;
        }

        if (segments[0] === "api" && segments[1] === "tickets" && segments[2]) {
          const id = segments[2];

          if (request.method === "PATCH") {
            const payload = await body(request);
            const error = validateTicket(payload, true);

            if (error) {
              json(response, 422, { error });
              return;
            }

            const ticket = await storage.update(id, payload);

            if (!ticket) {
              json(response, 404, { error: "Chamado não encontrado." });
              return;
            }

            json(response, 200, { data: ticket });
            return;
          }

          if (request.method === "DELETE") {
            const deleted = await storage.delete(id);

            if (!deleted) {
              json(response, 404, { error: "Chamado não encontrado." });
              return;
            }

            json(response, 200, { deleted: true });
            return;
          }
        }

        json(response, 404, { error: "Rota não encontrada." });
        return;
      }

      await serveStatic(response, url, publicDir);
    } catch (error) {
      json(response, 400, { error: error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3333);
  createServer().listen(port, () => {
    console.log(`Helpdesk rodando em http://localhost:${port}`);
  });
}

module.exports = { createServer, calculateStats, filterTickets };
