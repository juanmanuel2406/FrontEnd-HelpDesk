# Endpoints del Backend que debe tener la API

Base URL: `https://localhost:7124/api/v1`

---

## 1. User (`/User/`)

| Método | Ruta | Descripción | Request Body / Params |
|--------|------|-------------|----------------------|
| POST | `/User/login` | Login | `{ username, password }` |
| POST | `/User/register` | Registro | `{ username, password, email, fullname }` |
| GET | `/User/` | Listar todos los usuarios (Admin) | Header: Bearer token |
| PATCH | `/User/{id}/role` | Cambiar rol de usuario | `{ role: "admin" \| "agent" \| "viewer" }` |
| PATCH | `/User/{id}/availability` | Cambiar disponibilidad | `{ availability: "available" \| "busy" }` |

### Login response esperado:
```json
{
  "estado": true,
  "token": "jwt...",
  "userId": 1,
  "username": "juan",
  "fullname": "Juan Perez",
  "email": "juan@mail.com",
  "role": "admin",
  "active": true
}
```

---

## 2. Ticket (`/Ticket/`)

| Método | Ruta | Descripción | Request Body / Params |
|--------|------|-------------|----------------------|
| GET | `/Ticket/` | Listar todos los tickets | Header: Bearer token |
| GET | `/Ticket/{id}` | Ticket por ID | - |
| POST | `/Ticket/` | Crear ticket | `{ title, description, priority }` |
| PUT | `/Ticket/{id}` | Actualizar ticket | `{ title, description, priority, status? }` |
| DELETE | `/Ticket/{id}` | Eliminar (soft delete) ticket | - |
| PATCH | `/Ticket/{id}/assign` | Asignar ticket a usuario | `{ assignedToId: number }` |

El GET `/Ticket/` debe devolver tickets enriquecidos con:
- `createdByName` (string) - nombre del autor
- `assignedToName` (string, nullable) - nombre del asignado
- `teamId` (number, nullable) - equipo al que pertenece el ticket

### Filtro de tickets recibidos (usado en frontend):
El frontend filtra localmente los tickets donde:
- `assignedToId === userId` actual, O
- `teamId` pertenece a los equipos del usuario actual Y `assignedToId` es null

---

## 3. Team (`/Team/`)

| Método | Ruta | Descripción | Request Body |
|--------|------|-------------|-------------|
| GET | `/Team/` | Listar equipos | - |
| POST | `/Team/` | Crear equipo | `{ name }` |
| GET | `/Team/{id}/members` | Miembros del equipo | - |
| POST | `/Team/{id}/members` | Agregar miembro | `{ userId }` |
| DELETE | `/Team/{id}/members/{userId}` | Quitar miembro | - |

---

## 4. TicketHistory (`/TicketHistory/`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/TicketHistory/{ticketId}` | Obtener historial de un ticket |

### Response esperado:
```json
[
  {
    "id": 1,
    "ticketId": 1,
    "userName": "Juan Perez",
    "action": "creó el ticket",
    "description": "Se creó el ticket con prioridad Alta",
    "createdAt": "2026-06-10T..."
  }
]
```

---

## 5. Invitation (`/Invitation/`)

| Método | Ruta | Descripción | Request Body |
|--------|------|-------------|-------------|
| POST | `/Invitation/` | Invitar agente por email | `{ email }` |

---

## 6. Response envelope

Todas las respuestas deben seguir el formato:
```json
{
  "estado": true,
  "mensaje": "Mensaje opcional",
  ...datos
}
```

---

## 7. Roles del sistema

Los roles deben ser exactamente (case-insensitive):
- `admin` - acceso total, puede gestionar usuarios y equipos
- `agent` - puede crear/editar tickets, asignarse tickets
- `viewer` - solo lectura, sin botones de editar/eliminar/asignar

---

## 8. Campos adicionales en tabla Tickets

- `teamId` (int, nullable) - FK a Teams
- `assignedToId` (int, nullable) - FK a Users
- `createdById` (int) - FK a Users (ya existe)

---

## 9. Campos en tabla Users

- `role` (string) - "admin" | "agent" | "viewer"
- `availability` (string) - "available" | "busy"
- `active` (bool) - para indicar si la invitación fue aceptada

---

## 10. Notas adicionales

- Todos los endpoints protegidos requieren el header `Authorization: Bearer <token>`
- La interceptor `auth-interceptor.ts` ya agrega el token automáticamente a todas las requests excepto login y register
