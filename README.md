# ResolveDesk SLA Hub

ResolveDesk SLA Hub é um projeto full-stack Node.js para equipes de suporte que precisam controlar fila de tickets, risco de SLA, carga dos agentes e automações recorrentes de atendimento.

O projeto é intencionalmente comercial: demonstra um fluxo de negócio que um cliente freelance entende rapidamente, em vez de um CRUD genérico.

## Valor Comercial

- Reduz quebras de SLA ao ordenar tickets por risco e tempo de espera.
- Mostra carga dos agentes, pressão da fila aberta e impacto do plano do cliente.
- Simula automações de atribuição, marcação de atraso e alertas executivos.
- Entrega dashboard polido com endpoints de API documentados.
- Roda sem serviços externos, o que facilita demonstração em propostas.

## Funcionalidades

- Fila de tickets com prioridade, categoria, plano do cliente e agente responsável.
- Motor de SLA que calcula prazo, quebra e tickets próximos do vencimento.
- Resumo de carga dos agentes com capacidade e aderência por habilidade.
- Automação que atribui tickets sem dono e marca problemas críticos.
- Timeline do cliente e API de respostas.
- Dados seed para cenários realistas de demonstração.
- Testes de API, regras de negócio e smoke test.
- Dockerfile e notas de deploy.

## Stack

- Node.js 20+ com servidor HTTP nativo
- ES modules
- Frontend em JavaScript puro
- UI de dashboard em CSS
- Armazenamento seed em JSON
- Test runner nativo do Node

## Como Rodar Localmente

```bash
npm install
npm run check
npm test
npm run smoke
npm start
```

Acesse:

```text
http://localhost:3000
```

Você pode alterar a porta:

```bash
PORT=4182 npm start
```

## Preview da API

Principais endpoints:

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/tickets`
- `GET /api/tickets/:id`
- `POST /api/tickets`
- `POST /api/tickets/:id/replies`
- `POST /api/automation/run`

Veja [docs/api-endpoints.md](docs/api-endpoints.md) para payloads e exemplos.

## Dados de Demonstração

Os dados demo ficam em [data/seed.json](data/seed.json) e incluem:

- 5 tickets
- 4 clientes
- 4 agentes
- regras de SLA por prioridade
- histórico de mensagens

## Deploy

Docker:

```bash
docker build -t resolvedesk-sla-hub .
docker run -p 3000:3000 resolvedesk-sla-hub
```

Hospedagem Node genérica:

```bash
npm install --omit=dev
npm start
```

Use `PORT` do ambiente da plataforma ao publicar em Render, Railway, Fly.io ou serviços similares.

## Melhorias Comerciais

- Persistir tickets em PostgreSQL.
- Adicionar autenticação e permissões por perfil.
- Adicionar notificações por email ou WhatsApp.
- Adicionar anexos e notas internas.
- Adicionar logs de auditoria para compliance.
- Adicionar webhooks para CRM e sistemas de cobrança.
