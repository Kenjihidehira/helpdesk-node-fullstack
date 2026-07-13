const priorityWeight = {
  urgent: 100,
  high: 70,
  medium: 40,
  low: 10
};

const planWeight = {
  Enterprise: 35,
  Business: 20,
  Starter: 5
};

export function minutesBetween(start, end) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export function addMinutes(dateText, minutes) {
  return new Date(new Date(dateText).getTime() + minutes * 60000).toISOString();
}

export function buildTicketView(ticket, data, nowText = data.meta.now) {
  const customer = data.customers.find((item) => item.id === ticket.customerId) || null;
  const agent = data.agents.find((item) => item.id === ticket.assignedTo) || null;
  const targetMinutes = data.sla[ticket.priority] || data.sla.medium;
  const dueAt = addMinutes(ticket.createdAt, targetMinutes);
  const ageMinutes = minutesBetween(ticket.createdAt, nowText);
  const firstResponseMinutes = ticket.firstResponseAt ? minutesBetween(ticket.createdAt, ticket.firstResponseAt) : null;
  const breached = ticket.status !== "resolved" && !ticket.firstResponseAt && new Date(nowText) > new Date(dueAt);
  const dueSoon = ticket.status !== "resolved" && !ticket.firstResponseAt && !breached && minutesBetween(nowText, dueAt) <= 45;
  const score = (priorityWeight[ticket.priority] || 0) + Math.max(ageMinutes / 8, 0) + (planWeight[customer?.plan] || 0) + (breached ? 80 : 0);

  return {
    ...ticket,
    customer,
    agent,
    sla: {
      targetMinutes,
      dueAt,
      ageMinutes,
      firstResponseMinutes,
      breached,
      dueSoon,
      score: Math.round(score)
    },
    messages: data.messages.filter((message) => message.ticketId === ticket.id)
  };
}

export function listTickets(data, filters = {}) {
  return data.tickets
    .map((ticket) => buildTicketView(ticket, data))
    .filter((ticket) => !filters.status || ticket.status === filters.status)
    .filter((ticket) => !filters.priority || ticket.priority === filters.priority)
    .filter((ticket) => !filters.category || ticket.category === filters.category)
    .filter((ticket) => !filters.assignedTo || ticket.assignedTo === filters.assignedTo)
    .sort((a, b) => b.sla.score - a.sla.score);
}

export function getDashboard(data) {
  const tickets = listTickets(data);
  const active = tickets.filter((ticket) => ticket.status !== "resolved");
  const breached = active.filter((ticket) => ticket.sla.breached);
  const dueSoon = active.filter((ticket) => ticket.sla.dueSoon);
  const replied = tickets.filter((ticket) => ticket.sla.firstResponseMinutes !== null);
  const avgFirstResponse = replied.length
    ? Math.round(replied.reduce((sum, ticket) => sum + ticket.sla.firstResponseMinutes, 0) / replied.length)
    : 0;

  const agentLoad = data.agents.map((agent) => {
    const owned = active.filter((ticket) => ticket.assignedTo === agent.id);
    return {
      ...agent,
      openTickets: owned.length,
      utilization: Math.round((owned.length / agent.capacity) * 100),
      riskTickets: owned.filter((ticket) => ticket.sla.breached || ticket.sla.dueSoon).length
    };
  });

  return {
    generatedAt: data.meta.now,
    kpis: {
      openTickets: active.length,
      breached: breached.length,
      dueSoon: dueSoon.length,
      avgFirstResponse,
      revenueAtRisk: active.reduce((sum, ticket) => sum + (ticket.customer?.mrr || 0), 0),
      automationReady: active.filter((ticket) => !ticket.assignedTo || ticket.sla.breached).length
    },
    queue: active.slice(0, 8),
    agentLoad,
    automations: buildAutomationPlan(data)
  };
}

export function buildAutomationPlan(data) {
  const active = listTickets(data).filter((ticket) => ticket.status !== "resolved");
  const actions = [];

  for (const ticket of active) {
    if (!ticket.assignedTo) {
      const agent = findBestAgent(ticket, data);
      actions.push({
        type: "assignment",
        ticketId: ticket.id,
        label: "Atribuir " + ticket.id + " para " + (agent?.name || "triagem"),
        impact: "Responsável adicionado à fila"
      });
    }

    if (ticket.sla.breached) {
      actions.push({
        type: "sla-risk",
        ticketId: ticket.id,
        label: "Escalar SLA quebrado para " + ticket.customer?.name,
        impact: "Alerta executivo preparado"
      });
    }

    if (ticket.priority === "urgent" && ticket.customer?.plan === "Enterprise") {
      actions.push({
        type: "customer-success",
        ticketId: ticket.id,
        label: "Notificar CSM de " + ticket.customer.name,
        impact: "Conta de alto valor protegida"
      });
    }
  }

  return actions.slice(0, 6);
}

export function findBestAgent(ticket, data) {
  const active = data.tickets.filter((item) => item.status !== "resolved");
  return data.agents
    .filter((agent) => agent.skills.includes(ticket.category) || agent.skills.includes("priority"))
    .map((agent) => ({
      ...agent,
      openTickets: active.filter((item) => item.assignedTo === agent.id).length
    }))
    .sort((a, b) => (a.openTickets / a.capacity) - (b.openTickets / b.capacity))[0] || null;
}

export function createTicket(data, input) {
  const required = ["subject", "customerId", "priority", "category"];
  const missing = required.filter((field) => !input[field]);
  if (missing.length) {
    const error = new Error("Campos obrigatórios ausentes: " + missing.join(", "));
    error.status = 422;
    throw error;
  }
  if (!data.customers.some((customer) => customer.id === input.customerId)) {
    const error = new Error("customerId desconhecido");
    error.status = 422;
    throw error;
  }
  if (!data.sla[input.priority]) {
    const error = new Error("Prioridade inválida");
    error.status = 422;
    throw error;
  }

  const ticket = {
    id: "TCK-" + (2400 + data.tickets.length + 1),
    subject: input.subject,
    customerId: input.customerId,
    priority: input.priority,
    category: input.category,
    status: "open",
    assignedTo: input.assignedTo || null,
    createdAt: data.meta.now,
    firstResponseAt: null,
    tags: input.tags || []
  };

  data.tickets.push(ticket);
  return buildTicketView(ticket, data);
}

export function addReply(data, ticketId, input) {
  const ticket = data.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    const error = new Error("Ticket não encontrado");
    error.status = 404;
    throw error;
  }
  if (!input.author || !input.body) {
    const error = new Error("author e body são obrigatórios");
    error.status = 422;
    throw error;
  }
  if (!ticket.firstResponseAt && input.author === "agent") {
    ticket.firstResponseAt = data.meta.now;
  }
  const message = {
    ticketId,
    author: input.author,
    body: input.body,
    createdAt: data.meta.now
  };
  data.messages.push(message);
  return buildTicketView(ticket, data);
}

export function runAutomation(data) {
  const actions = buildAutomationPlan(data);
  for (const action of actions) {
    const ticket = data.tickets.find((item) => item.id === action.ticketId);
    if (!ticket) continue;
    if (action.type === "assignment" && !ticket.assignedTo) {
      const enriched = buildTicketView(ticket, data);
      ticket.assignedTo = findBestAgent(enriched, data)?.id || null;
      if (!ticket.tags.includes("auto-assigned")) ticket.tags.push("auto-assigned");
    }
    if (action.type === "sla-risk" && !ticket.tags.includes("sla-breach")) {
      ticket.tags.push("sla-breach");
    }
    if (action.type === "customer-success" && !ticket.tags.includes("csm-alert")) {
      ticket.tags.push("csm-alert");
    }
  }

  return {
    actions,
    dashboard: getDashboard(data)
  };
}
