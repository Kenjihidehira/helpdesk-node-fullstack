const ticketForm = document.querySelector("#ticketForm");
const stats = document.querySelector("#stats");
const ticketList = document.querySelector("#ticketList");
const ticketTemplate = document.querySelector("#ticketTemplate");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const refreshBtn = document.querySelector("#refreshBtn");

const priorityLabels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente"
};

const statusLabels = {
  aberto: "Aberto",
  andamento: "Em andamento",
  resolvido: "Resolvido"
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro inesperado.");
  }

  return data;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getQuery() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (statusFilter.value) params.set("status", statusFilter.value);
  if (priorityFilter.value) params.set("priority", priorityFilter.value);
  return params.toString();
}

function renderStats(data) {
  const cards = [
    ["Total", data.total],
    ["Abertos", data.open],
    ["Em andamento", data.inProgress],
    ["Críticos", data.critical]
  ];

  stats.innerHTML = cards
    .map(([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join("");
}

function renderTickets(tickets) {
  if (tickets.length === 0) {
    ticketList.innerHTML = "<p class='customer'>Nenhum chamado encontrado com esses filtros.</p>";
    return;
  }

  ticketList.innerHTML = "";

  tickets.forEach((ticket) => {
    const node = ticketTemplate.content.cloneNode(true);
    const article = node.querySelector(".ticket");
    const badge = node.querySelector(".priority");
    const title = node.querySelector("h3");
    const customer = node.querySelector(".customer");
    const notes = node.querySelector(".notes");
    const meta = node.querySelector(".meta");
    const statusSelect = node.querySelector(".status-select");
    const deleteButton = node.querySelector(".danger");

    article.dataset.id = ticket.id;
    badge.textContent = priorityLabels[ticket.priority] || ticket.priority;
    badge.classList.add(ticket.priority);
    title.textContent = ticket.subject;
    customer.textContent = ticket.customer;
    notes.textContent = ticket.notes || "Sem observações adicionais.";
    meta.textContent = `${ticket.assignee} • ${ticket.channel} • atualizado em ${formatDate(ticket.updatedAt)}`;
    statusSelect.value = ticket.status;

    statusSelect.addEventListener("change", async () => {
      await updateTicket(ticket.id, { status: statusSelect.value });
    });

    deleteButton.addEventListener("click", async () => {
      await deleteTicket(ticket.id);
    });

    ticketList.appendChild(node);
  });
}

async function loadDashboard() {
  const query = getQuery();
  const [ticketResponse, statsResponse] = await Promise.all([
    api(`/api/tickets${query ? `?${query}` : ""}`),
    api("/api/stats")
  ]);

  renderTickets(ticketResponse.data);
  renderStats(statsResponse.data);
}

async function updateTicket(id, data) {
  await api(`/api/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  await loadDashboard();
}

async function deleteTicket(id) {
  await api(`/api/tickets/${id}`, { method: "DELETE" });
  await loadDashboard();
}

ticketForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(ticketForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await api("/api/tickets", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    ticketForm.reset();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

[searchInput, statusFilter, priorityFilter].forEach((field) => {
  field.addEventListener("input", loadDashboard);
});

refreshBtn.addEventListener("click", loadDashboard);
loadDashboard();
