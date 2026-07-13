# Endpoints da API

URL base:

```text
http://localhost:3000
```

## GET /api/health

Retorna o status do serviço.

```json
{
  "ok": true,
  "service": "resolvedesk-sla-hub"
}
```

## GET /api/dashboard

Retorna KPIs, fila ordenada, carga dos agentes, faixas de SLA e sugestões de automação.

## GET /api/tickets

Parâmetros opcionais:

- `status=open`
- `priority=urgent`
- `category=technical`
- `assignedTo=ag-4`

## GET /api/tickets/:id

Retorna um ticket enriquecido com cliente, agente responsável, SLA e mensagens.

## POST /api/tickets

```json
{
  "subject": "Portal indisponível",
  "customerId": "cust-101",
  "priority": "urgent",
  "category": "technical"
}
```

## POST /api/tickets/:id/replies

```json
{
  "author": "agent",
  "body": "Estamos investigando o incidente."
}
```

## POST /api/automation/run

Executa o motor de automação demo:

- atribui tickets sem dono para agentes qualificados
- marca tickets vencidos
- sinaliza problemas urgentes de contas enterprise

O projeto mantém os dados em memória por segurança de demonstração.
