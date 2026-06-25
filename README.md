# Helpdesk Node Fullstack

Sistema de chamados full-stack feito com Node.js puro, HTML, CSS e JavaScript.

## Funcionalidades

- API REST sem frameworks externos
- Dashboard web responsivo
- Cadastro de chamados
- Filtros por busca, status e prioridade
- Atualização de status em tempo real
- Exclusão de chamados
- Estatísticas do atendimento
- Persistência em arquivo JSON
- Testes automatizados com `node:test`

## Como rodar

```bash
npm start
```

Acesse:

```txt
http://localhost:3333
```

## Testes

```bash
npm test
```

## Rotas principais

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Status da API |
| GET | `/api/tickets` | Lista chamados |
| GET | `/api/tickets?status=aberto` | Filtra chamados |
| GET | `/api/stats` | Estatísticas |
| POST | `/api/tickets` | Cria chamado |
| PATCH | `/api/tickets/:id` | Atualiza chamado |
| DELETE | `/api/tickets/:id` | Remove chamado |

## Tecnologias

- Node.js
- JavaScript
- HTML
- CSS
- JSON como banco local
- Node Test Runner
