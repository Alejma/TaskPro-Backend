# Payloads API - TaskPro (Frontend)

Guía de payloads para consumir el backend desde frontend.

## Base URL

- Local: `http://localhost:3000`
- Prefijo API: `/api`

## Header de autenticación

Usar en todos los endpoints protegidos:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Formato estándar de respuesta

### Respuesta exitosa

```json
{
  "success": true,
  "message": "Texto descriptivo",
  "data": {}
}
```

### Respuesta con error

```json
{
  "success": false,
  "message": "Mensaje de error",
  "details": null
}
```

---

## 1) Auth

### POST `/api/auth/login`

**Body**
```json
{
  "email": "admin@taskpro.com",
  "password": "Admin123*"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "name": "Administrador",
      "email": "admin@taskpro.com",
      "role": "ADMIN"
    }
  }
}
```

---

## 2) Users

### POST `/api/users` (ADMIN)

**Body**
```json
{
  "name": "Juan Perez",
  "email": "juan@taskpro.com",
  "password": "Password123*",
  "roleName": "COLABORADOR"
}
```

### GET `/api/users`

**Sin body**

### PUT `/api/users/:id`

**Params**
- `id` (number)

**Body (todos opcionales)**
```json
{
  "name": "Juan Perez Actualizado",
  "email": "juan.new@taskpro.com",
  "password": "NewPassword123*",
  "roleName": "GERENTE"
}
```

### PATCH `/api/users/:id/status`

**Params**
- `id` (number)

**Body**
```json
{
  "isActive": false
}
```

---

## 3) Projects

### POST `/api/projects` (ADMIN, GERENTE)

**Body**
```json
{
  "name": "Proyecto ERP",
  "description": "Implementacion del modulo financiero",
  "startDate": "2026-04-20T00:00:00.000Z",
  "endDate": "2026-06-30T00:00:00.000Z",
  "ownerId": 1
}
```

> `ownerId` es opcional; si no se envía, toma el usuario autenticado.

### GET `/api/projects`

**Sin body**

### GET `/api/projects/:id`

**Params**
- `id` (number)

### PUT `/api/projects/:id`

**Params**
- `id` (number)

**Body (campos opcionales)**
```json
{
  "name": "Proyecto ERP v2",
  "description": "Ajustes de alcance",
  "startDate": "2026-05-01T00:00:00.000Z",
  "endDate": "2026-07-15T00:00:00.000Z"
}
```

### PATCH `/api/projects/:id/status`

**Params**
- `id` (number)

**Body**
```json
{
  "status": "PAUSED"
}
```

Valores permitidos:
- `ACTIVE`
- `PAUSED`
- `FINISHED`

### DELETE `/api/projects/:id`

**Params**
- `id` (number)

**Sin body** (eliminación lógica)

### GET `/api/projects/:id/metrics`

**Params**
- `id` (number)

**Response `data` ejemplo**
```json
{
  "projectId": 1,
  "progressPercentage": 33.33,
  "completedTasks": 1,
  "totalTasks": 3,
  "loadByUser": {
    "2": 2,
    "3": 1
  }
}
```

---

## 4) Tasks

### POST `/api/tasks` (ADMIN, GERENTE)

**Body**
```json
{
  "title": "Disenar base de datos",
  "description": "Modelo inicial",
  "projectId": 1,
  "priority": 2,
  "dueDate": "2026-05-15T00:00:00.000Z",
  "status": "PENDING",
  "userIds": [2, 3]
}
```

Campos clave:
- `title` requerido
- `projectId` requerido
- `status` opcional (`PENDING`, `IN_PROGRESS`, `DONE`)
- `userIds` opcional (array de IDs)

### GET `/api/tasks/project/:id`

**Params**
- `id` (projectId number)

### GET `/api/tasks/kanban/:projectId`  ✅

**Params**
- `projectId` (number)

**Response 200 (`data`)**
```json
{
  "PENDING": [],
  "IN_PROGRESS": [],
  "DONE": []
}
```

### PATCH `/api/tasks/:id/status`  ✅

**Params**
- `id` (taskId number)

**Body**
```json
{
  "status": "IN_PROGRESS"
}
```

Valores permitidos:
- `PENDING`
- `IN_PROGRESS`
- `DONE`

### PUT `/api/tasks/:id`

**Params**
- `id` (taskId number)

**Body (todos opcionales)**
```json
{
  "title": "Disenar base de datos v2",
  "description": "Actualizar entidades",
  "status": "DONE",
  "priority": 1,
  "dueDate": "2026-05-20T00:00:00.000Z",
  "userIds": [2]
}
```

### POST `/api/tasks/:id/attachments`

**Params**
- `id` (taskId number)

**Content-Type**
- `multipart/form-data`

**Form-Data**
- `file` (tipo archivo) **obligatorio**

**Response `data` ejemplo**
```json
{
  "id": 1,
  "fileUrl": "/uploads/1713350000000-documento.pdf",
  "taskId": 10
}
```

### GET `/api/tasks/overdue/list`

**Sin body**

Devuelve tareas vencidas (`dueDate < now` y estado distinto de `DONE`).

---

## 5) Comments

### POST `/api/comments`

**Body**
```json
{
  "content": "Falta validar la API externa",
  "taskId": 10
}
```

### GET `/api/comments/task/:id`

**Params**
- `id` (taskId number)

---

## 6) Tipos y enums para frontend

### Roles
- `ADMIN`
- `GERENTE`
- `COLABORADOR`

### Estado de proyecto
- `ACTIVE`
- `PAUSED`
- `FINISHED`

### Estado de tarea (columnas Kanban)
- `PENDING`
- `IN_PROGRESS`
- `DONE`

---

## 7) Recomendaciones para integración frontend

- Guardar `token` de login y enviarlo en `Authorization`.
- Manejar `401` redirigiendo a login.
- Usar `PATCH /api/tasks/:id/status` para drag & drop en Kanban.
- Usar `GET /api/tasks/kanban/:projectId` para pintar columnas iniciales.
- Para adjuntos, enviar `FormData` y no JSON.
