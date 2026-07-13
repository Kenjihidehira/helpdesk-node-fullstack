const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});

const kpiLabels = {
  openTickets: "Tickets abertos",
  breached: "SLA quebrado",
  dueSoon: "Vence em breve",
  avgFirstResponse: "Resposta média",
  revenueAtRisk: "MRR em risco"
};

async function getDashboard() {
  const response = await fetch("/api/dashboard");
  if (!response.ok) throw new Error("Falha ao carregar dashboard");
  return response.json();
}

function renderKpis(kpis) {
  const html = Object.entries(kpiLabels).map(([key, label]) => {
    const value = key === "revenueAtRisk" ? formatCurrency.format(kpis[key]) : kpis[key];
    const suffix = key === "avgFirstResponse" ? " min" : "";
    return "<article class=\"kpi-card\"><span class=\"eyebrow\">" + label + "</span><strong>" + value + suffix + "</strong></article>";
  }).join("");
  document.querySelector("#kpis").innerHTML = html;
}

function renderQueue(queue) {
  document.querySelector("#ticketQueue").innerHTML = queue.map((ticket) => {
    const badge = ticket.sla.breached ? "breached" : ticket.sla.dueSoon ? "due" : ticket.priority;
    const badgeText = ticket.sla.breached ? "SLA quebrado" : ticket.sla.dueSoon ? "Vence em breve" : translatePriority(ticket.priority);
    return [
      "<article class=\"ticket\">",
      "<div class=\"ticket-top\"><h3>" + ticket.id + " - " + ticket.subject + "</h3><span class=\"badge " + badge + "\">" + badgeText + "</span></div>",
      "<p>" + ticket.customer.name + " - " + translatePlan(ticket.customer.plan) + " - " + (ticket.agent?.name || "Sem responsável") + "</p>",
      "<p>Score SLA " + ticket.sla.score + " - vence " + new Date(ticket.sla.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</p>",
      "</article>"
    ].join("");
  }).join("");
}

function renderAgents(agents) {
  document.querySelector("#agentLoad").innerHTML = agents.map((agent) => {
    return [
      "<article class=\"agent\">",
      "<div class=\"agent-top\"><strong>" + agent.name + "</strong><span>" + agent.utilization + "%</span></div>",
      "<p>" + agent.openTickets + " tickets abertos - " + agent.riskTickets + " em risco</p>",
      "<div class=\"bar\"><span style=\"width:" + Math.min(agent.utilization, 100) + "%\"></span></div>",
      "</article>"
    ].join("");
  }).join("");
}

function translatePriority(priority) {
  return { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" }[priority] || priority;
}

function translatePlan(plan) {
  return { Enterprise: "Enterprise", Business: "Business", Starter: "Inicial" }[plan] || plan;
}

function renderAutomation(actions) {
  document.querySelector("#automationList").innerHTML = actions.map((action) => {
    return "<article class=\"automation-item\"><strong>" + action.label + "</strong><p>" + action.impact + "</p></article>";
  }).join("");
}

async function render() {
  const dashboard = await getDashboard();
  renderKpis(dashboard.kpis);
  renderQueue(dashboard.queue);
  renderAgents(dashboard.agentLoad);
  renderAutomation(dashboard.automations);
  document.querySelector("#generatedAt").textContent = new Date(dashboard.generatedAt).toLocaleString();
}

document.querySelector("#runAutomation").addEventListener("click", async () => {
  const button = document.querySelector("#runAutomation");
  button.disabled = true;
  button.textContent = "Rodando...";
  await fetch("/api/automation/run", { method: "POST" });
  await render();
  button.disabled = false;
  button.textContent = "Rodar automação";
});

render().catch((error) => {
  document.body.insertAdjacentHTML("beforeend", "<pre class=\"error\">" + error.message + "</pre>");
});
