# TaskPro Backend

Backend en Node.js + Express + Prisma + PostgreSQL (Neon) listo para ejecutar.

## 1) Instalación

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## 2) Variables de entorno

Archivo `.env`:

```env
DATABASE_URL='postgresql://
JWT_SECRET=supersecretkey
PORT=3000
```

## 3) Login de ejemplo

`POST /api/auth/login`

```json
{
  "email": "admin@taskpro.com",
  "password": "Admin123*"
}
```

## 4) Kanban (obligatorio)

`GET /api/tasks/kanban/:projectId` retorna:

```json
{
  "PENDING": [],
  "IN_PROGRESS": [],
  "DONE": []
}
```

Mover tarea entre columnas:

`PATCH /api/tasks/:id/status`

```json
{
  "status": "IN_PROGRESS"
}
```

## 6) Documentación Swagger

- UI Swagger: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs.json`

## 5) CRUD ejemplo (Users)

- Crear usuario: `POST /api/users` (solo ADMIN)
- Listar usuarios: `GET /api/users`
- Editar usuario: `PUT /api/users/:id`
- Activar/desactivar: `PATCH /api/users/:id/status`

Todos requieren `Authorization: Bearer <token>` salvo login.
