# Backend - Lista de Tarefas

## Pré-requisitos
- Node.js 18+
- npm

## Instalação
```bash
cd backend
npm install
```

## Configuração
1. Copie o arquivo `.env.example` para `.env` e preencha com seus dados (SMTP, JWT, etc).

## Execução
```bash
npm run dev
```

O backend rodará por padrão em http://localhost:3001

## Rotas principais
- `POST /api/auth/register` — Cadastro de usuário
- `GET /api/auth/verify?token=...` — Verificação de email
- `POST /api/auth/login` — Login

### Tarefas
- `POST /api/tasks` — Criar tarefa (autenticado)
- `GET /api/tasks` — Listar tarefas do usuário (autenticado)
- `PUT /api/tasks/:id` — Editar tarefa (autenticado)
- `DELETE /api/tasks/:id` — Excluir tarefa (autenticado)

### Compartilhamento de tarefas
- `POST /api/tasks/:id/share` — Compartilhar tarefa com outro usuário (autenticado)
- `GET /api/tasks/shared/received` — Listar tarefas compartilhadas recebidas (autenticado)
- `GET /api/tasks/shared/sent` — Listar tarefas compartilhadas enviadas (autenticado)
- `POST /api/tasks/shared/:share_id/respond` — Aceitar ou recusar tarefa compartilhada (autenticado)

## Banco de dados
- Utiliza SQLite (arquivo `database.sqlite` criado automaticamente na pasta backend) 