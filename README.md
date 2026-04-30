# SGITA — Sistema de Gestión Inteligente de Trazabilidad Alimentaria

Backend REST API para la gestión operativa de un restaurante: recepción de pedidos de proveedores, registro de lotes/paquetes, control de stock de productos, seguimiento de incidencias y actualización automática de estados de caducidad.

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 20 LTS | El proyecto usa ESM nativo (`"type": "module"`) |
| npm | 9 | Incluido con Node.js |
| MongoDB | Atlas (nube) o 7.x local | Se conecta mediante cadena de conexión en `.env` |

---

## Variables de entorno

Copia `.env.example` a `.env` y rellena cada valor. **No commitees `.env` con credenciales reales.**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto de escucha del servidor | `3000` |
| `APP_URL` | URL base del servidor (usada en emails) | `http://localhost:3000` |
| `MONGODB_URL` | Cadena de conexión a MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | cadena hexadecimal de 64 bytes |
| `JWT_EXPIRES_IN` | Duración del token JWT | `8h` |
| `SMTP_HOST` | Host del servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Dirección de correo remitente | `noreply@dominio.com` |
| `SMTP_PASS` | Contraseña o app password del correo | — |
| `CRON_INTERVAL_MS` | Intervalo del cron de caducidad (ms) | `21600000` (6 h) |

---

## Instalación y ejecución
### AVISO - Modificar las propias variables del entorno .env

```bash
git clone <url-del-repositorio>
cd SGITA
npm install
cp .env.example .env   
```

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Modo desarrollo con recarga automática (nodemon + tsx) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Arranca el servidor desde `dist/` (requiere build previo) |
| `npm run seed:mock` | Inserta datos ficticios en MongoDB |

Para crear el primer usuario administrador:

```bash
npx tsx src/seeds/seed.ts
```

---

## Arquitectura

**Layered Architecture** con cuatro capas: Rutas → Controladores → Repositorios → Modelos. La lógica de negocio reside en los controladores; el acceso a datos queda encapsulado en los repositorios (ningún controlador accede a Mongoose directamente).

Principios clave:
- **Repository Pattern** — cada entidad tiene su propio repositorio con todas sus consultas a MongoDB.
- **DTO Pattern** — los datos de entrada se tipan en `src/dtos/`, actuando de contrato entre cliente y controlador.
- **RBAC declarativo** — `verifyToken` y `requireRol(...roles)` se aplican como middleware en la definición de rutas, sin lógica de permisos en controladores.
- **ESM con NodeNext** — todos los imports internos usan extensión `.js` explícita.
- **Cron nativo** — el job de caducidad usa `setInterval`, sin dependencias externas de scheduling.

---

## Estructura del proyecto

```
SGITA/
├── public/                   # Frontend estático servido por Express
├── src/
│   ├── index.ts              # Punto de entrada: Express, rutas, DB
│   ├── config/               # database.ts · cron.ts · mailer.ts
│   ├── models/               # Esquemas Mongoose + barrel de exportaciones
│   ├── dtos/                 # Tipos de entrada por módulo
│   ├── middlewares/          # verifyToken + requireRol
│   ├── controllers/          # Lógica de negocio + request/response
│   ├── repository/           # Consultas Mongoose por entidad
│   ├── routes/               # Definición de rutas con RBAC
│   └── seeds/                # seed.ts (admin) · mock-data.seed.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Autenticación y autorización

En el login se genera un JWT firmado con `JWT_SECRET` que incluye `id`, `rol` y `email`. El middleware `verifyToken` valida la firma y comprueba que el empleado existe y tiene `active: true`; responde `401` en caso contrario.

| Rol | Capacidades principales |
|-----|------------------------|
| `admin` | Acceso total. Registra empleados, elimina maestros |
| `encargado` | Crea/edita pedidos, proveedores, camiones y productos. Gestiona incidencias |
| `empleado` | Registra lotes en recepción, abre incidencias, consulta pedidos y productos |

`requireRol(...roles)` rechaza con `403` si el rol del token no está en la lista permitida.

**Recuperación de contraseña:** `POST /api/auth/forgot-password` genera un token temporal en el documento `Employee` y envía el enlace por email (Nodemailer). El reset se completa con `POST /api/auth/reset-password`.

### Secuencia de una petición autenticada

```mermaid
sequenceDiagram
    participant C as Cliente
    participant E as Express
    participant MW as verifyToken
    participant RR as requireRol
    participant Ctrl as Controlador
    participant Repo as Repositorio
    participant DB as MongoDB

    C->>E: HTTP Request + Authorization: Bearer <token>
    E->>MW: verifyToken
    MW->>MW: jwt.verify(token, JWT_SECRET)
    MW->>DB: Employee.findById(payload.id)
    DB-->>MW: Employee (active: true)
    MW->>E: next() — req.employee = {id, rol, email}
    E->>RR: requireRol('admin', 'encargado')
    RR->>RR: roles.includes(req.employee.rol)
    RR->>E: next()
    E->>Ctrl: handler(req, res)
    Ctrl->>Repo: método del repositorio
    Repo->>DB: consulta Mongoose
    DB-->>Repo: documentos
    Repo-->>Ctrl: datos tipados
    Ctrl-->>C: res.json(...)
```

---

## Cron job de caducidad

`initCron()` arranca automáticamente con el servidor y ejecuta `updateExpirationStatus()` cada `CRON_INTERVAL_MS` (por defecto 6 h). Actualiza el campo `status` de productos y lotes cuyas fechas han vencido. La primera ejecución ocurre en el arranque sin esperar el primer intervalo.

---

## Modelos de datos

```mermaid
erDiagram
    Employee {
        ObjectId _id PK
        string name
        string surname
        string dni
        string nss
        string numberEmployee
        string rol
        string email
        string password
        boolean active
        date createdAt
        string resetToken
        date resetTokenExpiry
    }
    Provider {
        ObjectId _id PK
        string name
        string contact
        string phoneNumber
        string email
        boolean active
    }
    Truck {
        ObjectId _id PK
        string licencePlate
        string truckModel
        boolean active
    }
    Product {
        ObjectId _id PK
        string name
        string category
        string productCode
        string unitType
        number quantity
        number minStock
        string status
        date expirationDate
        ObjectId providerId FK
        date updatedAt
    }
    Order {
        ObjectId _id PK
        string numberOrder
        ObjectId providerId FK
        ObjectId truckId FK
        ObjectId employeeId FK
        date dateArriveOrder
        date dateRealReception
        string status
        string documentUrl
        date createdAt
    }
    OrderProduct {
        ObjectId _id PK
        ObjectId orderId FK
        ObjectId productId FK
        number expectedQuantity
        number receivedQuantity
        string scannedCode
        date expiredDate
    }
    Batch {
        ObjectId _id PK
        string batchCode
        ObjectId orderId FK
        ObjectId productId FK
        ObjectId employeeId FK
        number unitQuantity
        date expireDate
        string status
        date registeredAt
    }
    Incidence {
        ObjectId _id PK
        ObjectId orderId FK
        ObjectId providerId FK
        ObjectId employeeId FK
        string type
        string description
        string status
        date createdAt
    }

    Provider ||--o{ Product : "suministra"
    Provider ||--o{ Order : "origina"
    Provider ||--o{ Incidence : "involucrado en"
    Truck ||--o{ Order : "transporta"
    Employee ||--o{ Order : "gestiona"
    Employee ||--o{ Batch : "registra"
    Employee ||--o{ Incidence : "reporta"
    Order ||--o{ OrderProduct : "contiene"
    Order ||--o{ Batch : "agrupa"
    Order ||--o{ Incidence : "genera"
    Product ||--o{ OrderProduct : "referenciado en"
    Product ||--o{ Batch : "identifica"
```

### Estados de las entidades

**Product / Batch — `status`**

| Estado | Significado |
|--------|-------------|
| `fresh` | En buen estado |
| `soon_expire` / `soon to expire` | Próximo a caducar |
| `expired` | Fecha de caducidad superada (actualizado por el cron) |

**Order — `status`**

| Estado | Significado |
|--------|-------------|
| `pending` | Pendiente de recepción |
| `received` | Recepcionado sin incidencias |
| `incidence` | Recepcionado con diferencias detectadas |

**Incidence** — tipos: `incorrect quantity` · `expired product` · `damaged product` · `other`  
**Incidence** — estados: `open` · `in progress` · `resolved`

> Índice único `{batchCode, orderId}` en `Batch`: no puede repetirse el mismo código de lote dentro de un mismo pedido.

---

## Datos mock

```bash
npm run seed:mock
```

Limpia documentos mock anteriores e inserta: 1 empleado, 8 proveedores, 6 camiones, 24 productos (8 categorías × 3 estados de caducidad) y 10 pedidos con 6–8 líneas de producto cada uno.

**Credenciales mock:** `mock.employee@mock.sgita.local` / `MockPass123!` (rol `empleado`)

---

## Endpoints de la API

Todas las rutas `/api/*` requieren `Authorization: Bearer <token>`, excepto login, `forgot-password` y `reset-password`.

| Método | Ruta | Rol mínimo | Descripción |
|--------|------|------------|-------------|
| `POST` | `/api/auth/login` | — | Inicia sesión, devuelve JWT |
| `GET` | `/api/auth/me` | cualquiera | Perfil del empleado autenticado |
| `POST` | `/api/auth/register` | `admin` | Registra un nuevo empleado |
| `POST` | `/api/auth/logout` | cualquiera | Cierra sesión (invalidación cliente) |
| `POST` | `/api/auth/forgot-password` | — | Envía email de recuperación |
| `POST` | `/api/auth/reset-password` | — | Restablece contraseña con token |
| `GET` | `/api/providers` | cualquiera | Lista proveedores |
| `GET` | `/api/providers/:id` | cualquiera | Obtiene proveedor por ID |
| `POST` | `/api/providers` | `encargado` | Crea proveedor |
| `PUT` | `/api/providers/:id` | `encargado` | Actualiza proveedor |
| `DELETE` | `/api/providers/:id` | `admin` | Elimina proveedor |
| `GET` | `/api/trucks` | cualquiera | Lista camiones |
| `GET` | `/api/trucks/:id` | cualquiera | Obtiene camión por ID |
| `POST` | `/api/trucks` | `encargado` | Crea camión |
| `PUT` | `/api/trucks/:id` | `encargado` | Actualiza camión |
| `DELETE` | `/api/trucks/:id` | `admin` | Elimina camión |
| `GET` | `/api/orders` | cualquiera | Lista pedidos |
| `GET` | `/api/orders/status/:status` | cualquiera | Filtra por estado |
| `GET` | `/api/orders/:id` | cualquiera | Pedido con líneas de producto |
| `POST` | `/api/orders` | `encargado` | Crea pedido con líneas |
| `POST` | `/api/orders/:id/reception` | cualquiera | Registra recepción real |
| `GET` | `/api/orders/:orderId/lots` | cualquiera | Lista lotes de un pedido |
| `POST` | `/api/orders/:orderId/batch` | cualquiera | Registra lote individual |
| `POST` | `/api/orders/:orderId/lots/bulk` | cualquiera | Registra múltiples lotes |
| `POST` | `/api/orders/:orderId/close` | cualquiera | Cierra pedido, genera incidencias automáticas |
| `GET` | `/api/lots/status/:status` | cualquiera | Filtra lotes por estado |
| `GET` | `/api/products` | cualquiera | Lista productos |
| `GET` | `/api/products/stock` | cualquiera | Productos bajo stock mínimo |
| `GET` | `/api/products/status/:status` | cualquiera | Filtra por estado de caducidad |
| `GET` | `/api/products/:id` | cualquiera | Obtiene producto por ID |
| `POST` | `/api/products` | `encargado` | Crea producto |
| `PUT` | `/api/products/:id` | `encargado` | Actualiza producto |
| `DELETE` | `/api/products/:id` | `admin` | Elimina producto |
| `GET` | `/api/incidences` | cualquiera | Lista incidencias |
| `GET` | `/api/incidences/order/:orderId` | cualquiera | Incidencias de un pedido |
| `GET` | `/api/incidences/:id` | cualquiera | Obtiene incidencia por ID |
| `POST` | `/api/incidences` | cualquiera | Crea incidencia |
| `PATCH` | `/api/incidences/:id/status` | `encargado` | Actualiza estado de incidencia |
| `GET` | `/api/employees` | `encargado` | Lista empleados |
| `GET` | `/api/health` | — | Comprueba que el servidor está activo |

---

## Licencia

ISC
-- Author: Maksym Kostashenko
-- SGITA Version : V1.0.0