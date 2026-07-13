import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname } from "node:path";
import { loadSeed, cloneData } from "./storage.js";
import { addReply, createTicket, getDashboard, listTickets, buildTicketView, runAutomation } from "./helpdeskService.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, error) {
  sendJson(res, error.status || 500, {
    error: error.message || "Erro interno do servidor"
  });
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

async function serveStatic(req, res) {
  const requested = new URL(req.url, "http://localhost").pathname;
  const cleanPath = requested === "/" ? "/index.html" : requested;
  const filePath = normalize(join(publicDir, cleanPath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Proibido");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Não encontrado");
  }
}

export async function createServer(seed) {
  const state = cloneData(seed || await loadSeed());

  return createHttpServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    try {
      if (url.pathname === "/api/health" && req.method === "GET") {
        return sendJson(res, 200, { ok: true, service: "resolvedesk-sla-hub" });
      }

      if (url.pathname === "/api/dashboard" && req.method === "GET") {
        return sendJson(res, 200, getDashboard(state));
      }

      if (url.pathname === "/api/tickets" && req.method === "GET") {
        return sendJson(res, 200, {
          tickets: listTickets(state, Object.fromEntries(url.searchParams.entries()))
        });
      }

      if (url.pathname === "/api/tickets" && req.method === "POST") {
        return sendJson(res, 201, createTicket(state, await parseBody(req)));
      }

      const replyMatch = url.pathname.match(/^\/api\/tickets\/([^/]+)\/replies$/);
      if (replyMatch && req.method === "POST") {
        return sendJson(res, 200, addReply(state, replyMatch[1], await parseBody(req)));
      }

      const ticketMatch = url.pathname.match(/^\/api\/tickets\/([^/]+)$/);
      if (ticketMatch && req.method === "GET") {
        const ticket = state.tickets.find((item) => item.id === ticketMatch[1]);
        if (!ticket) return sendJson(res, 404, { error: "Ticket não encontrado" });
        return sendJson(res, 200, buildTicketView(ticket, state));
      }

      if (url.pathname === "/api/automation/run" && req.method === "POST") {
        return sendJson(res, 200, runAutomation(state));
      }

      if (req.method === "GET") {
        return serveStatic(req, res);
      }

      sendJson(res, 404, { error: "Rota não encontrada" });
    } catch (error) {
      sendError(res, error);
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const server = await createServer();
  server.listen(port, () => {
    console.log("ResolveDesk SLA Hub running on http://localhost:" + port);
  });
}
