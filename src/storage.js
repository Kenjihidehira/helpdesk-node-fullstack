const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const seedTickets = [
  {
    id: "seed-1",
    customer: "Mercado Sakura",
    subject: "Erro ao emitir relatório mensal",
    priority: "alta",
    status: "aberto",
    assignee: "Wesley",
    channel: "email",
    notes: "Cliente precisa enviar fechamento até o fim do dia.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "seed-2",
    customer: "Clínica Vida",
    subject: "Dúvida sobre cadastro de usuários",
    priority: "media",
    status: "andamento",
    assignee: "Ana",
    channel: "chat",
    notes: "Foi enviado passo a passo inicial.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: "seed-3",
    customer: "Tech Norte",
    subject: "Solicitação de integração com API",
    priority: "baixa",
    status: "resolvido",
    assignee: "Marcos",
    channel: "telefone",
    notes: "Integração liberada em ambiente de testes.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
  }
];

class TicketStorage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async ensureFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, JSON.stringify(seedTickets, null, 2));
    }
  }

  async all() {
    await this.ensureFile();
    const content = await fs.readFile(this.filePath, "utf8");
    return JSON.parse(content);
  }

  async save(tickets) {
    await this.ensureFile();
    await fs.writeFile(this.filePath, JSON.stringify(tickets, null, 2));
  }

  async create(data) {
    const tickets = await this.all();
    const now = new Date().toISOString();
    const ticket = {
      id: crypto.randomUUID(),
      customer: data.customer.trim(),
      subject: data.subject.trim(),
      priority: data.priority || "media",
      status: "aberto",
      assignee: data.assignee?.trim() || "Sem responsável",
      channel: data.channel || "email",
      notes: data.notes?.trim() || "",
      createdAt: now,
      updatedAt: now
    };

    tickets.unshift(ticket);
    await this.save(tickets);
    return ticket;
  }

  async update(id, data) {
    const tickets = await this.all();
    const index = tickets.findIndex((ticket) => ticket.id === id);

    if (index === -1) return null;

    tickets[index] = {
      ...tickets[index],
      ...data,
      customer: typeof data.customer === "string" ? data.customer.trim() : tickets[index].customer,
      subject: typeof data.subject === "string" ? data.subject.trim() : tickets[index].subject,
      assignee: typeof data.assignee === "string" ? data.assignee.trim() : tickets[index].assignee,
      notes: typeof data.notes === "string" ? data.notes.trim() : tickets[index].notes,
      updatedAt: new Date().toISOString()
    };

    await this.save(tickets);
    return tickets[index];
  }

  async delete(id) {
    const tickets = await this.all();
    const nextTickets = tickets.filter((ticket) => ticket.id !== id);

    if (nextTickets.length === tickets.length) return false;

    await this.save(nextTickets);
    return true;
  }
}

module.exports = { TicketStorage, seedTickets };
