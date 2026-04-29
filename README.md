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

> **Nota de seguridad:** el repositorio actual incluye un `.env` con credenciales reales. Antes de cualquier colaboración o despliegue, rota todos los secretos y añade `.env` al `.gitignore`.

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd SGITA

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores reales
```

---

## Ejecución

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Modo desarrollo con recarga automática (nodemon + tsx) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Arranca el servidor desde `dist/` (requiere build previo) |
| `npm run seed:mock` | Inserta datos ficticios en MongoDB (ver sección Datos Mock) |

Para crear el primer usuario administrador antes de usar la aplicación, ejecuta directamente:

```bash
npx tsx src/seeds/seed.ts
```

---

## Dependencias

### Producción

| Paquete | Versión | Uso |
|---------|---------|-----|
| `express` | ^5.2.1 | Framework HTTP principal |
| `mongoose` | ^9.3.0 | ODM para MongoDB; define modelos y gestiona la conexión |
| `jsonwebtoken` | ^9.0.3 | Firma y verificación de tokens JWT |
| `bcryptjs` | ^3.0.3 | Hash de contraseñas con sal |
| `dotenv` | ^16.6.1 | Carga de variables de entorno desde `.env` |
| `cors` | ^2.8.5 | Cabeceras CORS para peticiones cross-origin |
| `nodemailer` | ^8.0.4 | Envío de emails SMTP (recuperación de contraseña) |

### Desarrollo

| Paquete | Uso |
|---------|-----|
| `typescript` | Compilador TypeScript |
| `tsx` | Ejecuta TypeScript directamente sin compilar (dev + seeds) |
| `nodemon` | Reinicia el servidor al detectar cambios en `src/` |
| `@types/*` | Definiciones de tipos para las dependencias de producción |

---

## Arquitectura

El proyecto sigue una **arquitectura por capas (Layered Architecture)** con separación clara de responsabilidades. No existe capa de servicios: la lógica de negocio reside en los controladores y el acceso a datos en los repositorios.

```mermaid
flowchart TD
    Client["Cliente\n(Navegador / Frontend estático)"]

    subgraph Express["Servidor Express"]
        Static["Archivos estáticos\npublic/"]
        MW["Middleware\nCORS · JSON · URLEncoded"]
        Auth["auth.middleware\nverifyToken · requireRol"]

        subgraph Routes["Rutas  /api/*"]
            R1["/api/auth"]
            R2["/api/providers"]
            R3["/api/trucks"]
            R4["/api/orders"]
            R5["/api/products"]
            R6["/api/incidences"]
            R7["/api/employees"]
            R8["/api/lots  (batch)"]
        end

        subgraph Controllers["Controladores"]
            C1["auth.controller"]
            C2["masters.controller\n(providers + trucks)"]
            C3["order.controller"]
            C4["product.controller"]
            C5["incidence.controller"]
            C6["employee.controller"]
            C7["batch.controller"]
        end

        subgraph Repos["Repositorios"]
            Repo1["auth.repository"]
            Repo2["provider.repository"]
            Repo3["truck.repository"]
            Repo4["order.repository"]
            Repo5["product.repository"]
            Repo6["incidence.repository"]
            Repo7["batch.repository"]
        end
    end

    subgraph Infra["Infraestructura"]
        DB[("MongoDB\n(Mongoose Models)")]
        Cron["Cron job\ncaducidad automática"]
        Mailer["Nodemailer\nSMTP"]
    end

    Client --> MW
    MW --> Auth
    Auth --> Routes
    Routes --> Controllers
    Controllers --> Repos
    Repos --> DB
    C1 --> Mailer
    Cron --> Repo5
    Cron --> Repo7
```

### Principios de diseño

- **Repository Pattern** — cada entidad tiene su propio repositorio que encapsula todas las consultas a MongoDB. Los controladores nunca acceden a los modelos de Mongoose directamente.
- **DTO (Data Transfer Objects)** — cada módulo define su propio DTO en `src/dtos/` para validar y tipar los datos de entrada de las peticiones.
- **RBAC por middleware** — la autorización se aplica declarativamente en la definición de rutas mediante `requireRol(...roles)`, sin lógica de permisos dispersa en controladores.
- **ESM nativo** — el proyecto usa ES Modules (`"type": "module"` en `package.json`) con resolución `NodeNext`, lo que exige extensiones `.js` en todos los imports internos.

---

## Estructura del proyecto

```
SGITA/
├── public/                   # Frontend estático servido por Express
│   ├── index.html            # Página de inicio / redirección
│   ├── login.html
│   ├── dashboard.html
│   ├── employee.html
│   ├── css/                  # Hojas de estilo por página
│   └── js/                   # Lógica de cliente por página
│
├── src/
│   ├── index.ts              # Punto de entrada: configura Express, monta rutas, conecta DB
│   │
│   ├── config/
│   │   ├── database.ts       # connectDB(): conecta Mongoose y gestiona eventos de conexión
│   │   ├── cron.ts           # initCron(): actualización periódica de estados de caducidad
│   │   └── mailer.ts         # Transporter de Nodemailer (recuperación de contraseña)
│   │
│   ├── models/               # Esquemas y modelos de Mongoose (fuente de verdad del dominio)
│   │   ├── Employee.ts
│   │   ├── Provider.ts
│   │   ├── Truck.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   ├── OrderProduct.ts   # Líneas de pedido (productos esperados vs. recibidos)
│   │   ├── Batch.ts          # Lotes/paquetes físicos registrados en recepción
│   │   ├── Incidence.ts
│   │   └── index.ts          # Barrel de exportaciones y registro de modelos
│   │
│   ├── dtos/                 # Tipos de entrada validados por los controladores
│   │   ├── auth.dto.ts
│   │   ├── batch.dto.ts
│   │   ├── incidence.dto.ts
│   │   ├── order.dto.ts
│   │   ├── product.dto.ts
│   │   ├── provider.dto.ts
│   │   └── truck.dto.ts
│   │
│   ├── middlewares/
│   │   └── auth.middleware.ts  # verifyToken + requireRol
│   │
│   ├── controllers/          # Lógica de negocio y manejo de request/response
│   │   ├── auth.controller.ts
│   │   ├── masters.controller.ts  # Proveedores y camiones
│   │   ├── order.controller.ts
│   │   ├── product.controller.ts
│   │   ├── incidence.controller.ts
│   │   ├── employee.controller.ts
│   │   └── batch.controller.ts
│   │
│   ├── repository/           # Acceso a datos: consultas Mongoose por entidad
│   │   ├── auth.repository.ts
│   │   ├── provider.repository.ts
│   │   ├── truck.repository.ts
│   │   ├── order.repository.ts
│   │   ├── product.repository.ts
│   │   ├── incidence.repository.ts
│   │   └── batch.repository.ts
│   │
│   ├── routes/               # Definición de rutas y aplicación de middleware RBAC
│   │   ├── auth.routes.ts
│   │   ├── index.routes.ts   # Providers, trucks, orders, products, incidences
│   │   ├── batch.routes.ts
│   │   └── employee.routes.ts
│   │
│   └── seeds/
│       ├── seed.ts           # Crea el primer usuario administrador
│       └── mock-data.seed.ts # Genera datos ficticios para desarrollo/pruebas
│
├── dist/                     # Salida de compilación TypeScript (generado, no commitear)
├── .env                      # Variables de entorno (no commitear)
├── .env.example              # Plantilla de variables de entorno
├── package.json
├── tsconfig.json
└── nodemon.json
```

---

## Cómo funciona el backend

### Flujo de una petición autenticada

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

### Arranque del servidor

Al ejecutar `npm run dev` o `npm start`, `src/index.ts`:

1. Carga las variables de entorno con `dotenv`.
2. Configura los middlewares globales (CORS, JSON parser, archivos estáticos).
3. Monta todos los routers bajo `/api/*`.
4. Llama a `connectDB()`, que registra todos los modelos importando `src/models/index.ts` antes de conectar.
5. Una vez conectado, llama a `initCron()` que ejecuta el ciclo de caducidad inmediatamente y luego cada `CRON_INTERVAL_MS` milisegundos.
6. Arranca el servidor HTTP en el puerto configurado.

---

## Autenticación y autorización

### JWT

- En el login, el servidor genera un token JWT firmado con `JWT_SECRET` que incluye `id`, `rol` y `email` del empleado.
- El token viaja en la cabecera `Authorization: Bearer <token>` en cada petición protegida.
- `verifyToken` valida la firma, verifica que el empleado existe y que tiene `active: true`. Si el token ha caducado o el empleado está inactivo, responde `401`.

### Roles (RBAC)

| Rol | Descripción | Capacidades |
|-----|-------------|-------------|
| `admin` | Administrador del sistema | Acceso total. Registra empleados, elimina maestros, gestiona todo |
| `encargado` | Responsable de almacén | Crea y edita pedidos, proveedores, camiones y productos. Cierra pedidos. Gestiona incidencias |
| `empleado` | Operario de almacén | Registra lotes en recepción, abre incidencias, consulta pedidos y productos |

`requireRol(...roles)` se aplica por ruta en la definición del router, rechazando con `403` si el rol del token no está en la lista permitida.

### Recuperación de contraseña

El flujo `POST /api/auth/forgot-password` → `POST /api/auth/reset-password` genera un token temporal almacenado en el documento `Employee` (`resetToken` + `resetTokenExpiry`) y envía el enlace de restablecimiento por email mediante Nodemailer.

---

## Cron job de caducidad

`initCron()` (en `src/config/cron.ts`) arranca automáticamente con el servidor y ejecuta `updateExpirationStatus()` de forma periódica:

- **`ProductRepository.updateStatusExpiredProducts()`** — actualiza el campo `status` de los productos cuya `expirationDate` ha pasado.
- **`BatchRepository.updateExpirationStatus()`** — actualiza el campo `status` de los lotes registrados cuya `expireDate` ha pasado.

El intervalo se configura con `CRON_INTERVAL_MS` (por defecto 6 horas). La primera ejecución ocurre en el arranque, sin esperar el primer intervalo.

---

## Conexión con MongoDB

`src/config/database.ts` exporta `connectDB()`, que:

1. Lee `MONGODB_URL` del entorno. Si no existe, lanza un error y detiene el proceso.
2. Llama a `mongoose.connect(url)`.
3. Registra listeners para los eventos `disconnected` y `error` de la conexión, emitiendo advertencias por consola.

Antes de que `connectDB()` sea invocado desde `index.ts`, se importa `src/models/index.ts`. Este barrel de exportaciones registra todos los modelos de Mongoose en el ODM, asegurando que las referencias cruzadas entre colecciones (p. ej. `ref: 'Proveedor'`) estén disponibles desde el primer uso.

---

## Modelos de datos

### Diagrama entidad-relación

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

### Colecciones y estados

**Employee** — colección `Empleados`

| Campo | Tipo | Notas |
|-------|------|-------|
| `dni`, `nss`, `numberEmployee`, `email` | String | Únicos en la colección |
| `rol` | `'admin'` \| `'encargado'` \| `'empleado'` | Controla el acceso RBAC |
| `active` | Boolean | Un empleado inactivo no puede autenticarse |
| `resetToken` / `resetTokenExpiry` | String / Date | Opcionales; usados solo durante el flujo de recuperación de contraseña |

**Product** — colección `Products`

| Estado (`status`) | Significado |
|-------------------|-------------|
| `fresh` | Producto con fecha de caducidad lejana |
| `soon_expire` | Próximo a caducar (umbral definido en el repositorio) |
| `expired` | Fecha de caducidad superada |

| Unidad (`unitType`) | Valores posibles |
|---------------------|-----------------|
| — | `kg`, `gram`, `liter`, `box`, `unit` |

**Order** — colección `Orders`

| Estado (`status`) | Significado |
|-------------------|-------------|
| `pending` | Pedido creado, pendiente de recepción |
| `received` | Recepcionado sin incidencias |
| `incidence` | Recepcionado con diferencias detectadas |

**Batch** — colección `Batchs`

| Estado (`status`) | Significado |
|-------------------|-------------|
| `fresh` | Lote en buen estado |
| `soon to expire` | Próximo a caducar |
| `expired` | Caducado (actualizado por el cron) |

> Índice único compuesto `{batchCode, orderId}`: no puede repetirse el mismo código de lote dentro de un mismo pedido.

**Incidence** — colección `Incidences`

| Tipo (`type`) | Descripción |
|---------------|-------------|
| `incorrect quantity` | La cantidad recibida no coincide con la esperada |
| `expired product` | El producto llega caducado |
| `damaged product` | El producto llega en mal estado |
| `other` | Otro tipo de incidencia |

| Estado (`status`) | Significado |
|-------------------|-------------|
| `open` | Recién creada, sin gestionar |
| `in progress` | En proceso de resolución |
| `resolved` | Incidencia cerrada |

---

## Datos mock

El seed de datos ficticios se lanza con:

```bash
npm run seed:mock
```

El script `src/seeds/mock-data.seed.ts`:

1. **Limpia** los documentos anteriores identificados por sus prefijos mock antes de insertar nuevos datos, evitando duplicados.
2. **Inserta** el siguiente conjunto de datos de prueba:

| Entidad | Cantidad | Prefijo / dominio identificador |
|---------|----------|---------------------------------|
| Empleado | 1 | email: `mock.employee@mock.sgita.local` |
| Proveedores | 8 | email: `*@mock.sgita.local` |
| Camiones | 6 | matrícula: `MOCK-TRK-*` |
| Productos | 24 | código: `MOCK-P-*` (8 categorías × 3 estados: fresh / soon\_expire / expired) |
| Pedidos pendientes | 10 | número: `MOCK-ORD-*` (con 6–8 líneas de producto cada uno) |

**Credenciales del empleado mock:**

| Campo | Valor |
|-------|-------|
| Email | `mock.employee@mock.sgita.local` |
| Contraseña | `MockPass123!` |
| Rol | `empleado` |

Para crear el primer usuario administrador real, usa `npx tsx src/seeds/seed.ts`.

---

## Patrones de código

- **Layered Architecture** — separación estricta en cuatro capas: Rutas → Controladores → Repositorios → Modelos. Ninguna capa accede a la capa no adyacente.
- **Repository Pattern** — cada entidad de dominio tiene su propio repositorio que centraliza todas las consultas a MongoDB. Los controladores trabajan con datos ya procesados, nunca con el ODM directamente.
- **DTO Pattern** — los datos de entrada de cada petición se tipan mediante interfaces DTO definidas en `src/dtos/`. Actúan como contrato entre el cliente y el controlador.
- **Middleware declarativo** — la autenticación (`verifyToken`) y la autorización (`requireRol`) se aplican como middleware en la definición de la ruta, manteniendo los controladores libres de lógica de seguridad.
- **Barrel exports** — `src/models/index.ts` centraliza la exportación de modelos e interfaces, garantizando el registro completo de modelos de Mongoose antes de la conexión.
- **ESM con NodeNext** — todos los imports internos usan extensión `.js` explícita para cumplir con la resolución de módulos de Node.js en modo ESM.
- **Strict TypeScript** — `tsconfig.json` activa `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`, maximizando la seguridad de tipos en tiempo de compilación.
- **Cron sin dependencias externas** — el job de caducidad se implementa con `setInterval` nativo, sin librerías adicionales de scheduling.

---

## Endpoints de la API

Todas las rutas bajo `/api/*` (excepto `/api/auth/login`, `/api/auth/forgot-password` y `/api/auth/reset-password`) requieren cabecera `Authorization: Bearer <token>`.

### Autenticación — `/api/auth`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `POST` | `/api/auth/login` | No | — | Inicia sesión y devuelve JWT |
| `GET` | `/api/auth/me` | Sí | cualquiera | Devuelve el perfil del empleado autenticado |
| `POST` | `/api/auth/register` | Sí | `admin` | Registra un nuevo empleado |
| `POST` | `/api/auth/logout` | Sí | cualquiera | Cierra sesión (invalidación por cliente) |
| `POST` | `/api/auth/forgot-password` | No | — | Envía email de recuperación de contraseña |
| `POST` | `/api/auth/reset-password` | No | — | Establece nueva contraseña con token temporal |

### Proveedores — `/api/providers`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/providers` | Sí | cualquiera | Lista todos los proveedores |
| `GET` | `/api/providers/:id` | Sí | cualquiera | Obtiene un proveedor por ID |
| `POST` | `/api/providers` | Sí | `encargado` | Crea un nuevo proveedor |
| `PUT` | `/api/providers/:id` | Sí | `encargado` | Actualiza un proveedor |
| `DELETE` | `/api/providers/:id` | Sí | `admin` | Elimina un proveedor |

### Camiones — `/api/trucks`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/trucks` | Sí | cualquiera | Lista todos los camiones |
| `GET` | `/api/trucks/:id` | Sí | cualquiera | Obtiene un camión por ID |
| `POST` | `/api/trucks` | Sí | `encargado` | Crea un nuevo camión |
| `PUT` | `/api/trucks/:id` | Sí | `encargado` | Actualiza un camión |
| `DELETE` | `/api/trucks/:id` | Sí | `admin` | Elimina un camión |

### Pedidos — `/api/orders`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/orders` | Sí | cualquiera | Lista todos los pedidos |
| `GET` | `/api/orders/status/:status` | Sí | cualquiera | Filtra pedidos por estado (`pending`, `received`, `incidence`) |
| `GET` | `/api/orders/:id` | Sí | cualquiera | Obtiene un pedido con sus líneas de producto |
| `POST` | `/api/orders` | Sí | `encargado` | Crea un nuevo pedido con líneas de producto |
| `POST` | `/api/orders/:id/reception` | Sí | cualquiera | Registra la recepción real del pedido |

### Lotes / Batches — `/api/orders/:orderId` y `/api/lots`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/orders/:orderId/lots` | Sí | cualquiera | Lista los lotes registrados de un pedido |
| `POST` | `/api/orders/:orderId/batch` | Sí | cualquiera | Registra un lote individual |
| `POST` | `/api/orders/:orderId/lots/bulk` | Sí | cualquiera | Registra múltiples lotes en una sola petición |
| `POST` | `/api/orders/:orderId/close` | Sí | cualquiera | Cierra el pedido, compara cantidades y genera incidencias automáticas |
| `GET` | `/api/lots/status/:status` | Sí | cualquiera | Filtra lotes por estado (`fresh`, `soon to expire`, `expired`) |

### Productos — `/api/products`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/products` | Sí | cualquiera | Lista todos los productos |
| `GET` | `/api/products/stock` | Sí | cualquiera | Lista productos por debajo del stock mínimo |
| `GET` | `/api/products/status/:status` | Sí | cualquiera | Filtra productos por estado de caducidad |
| `GET` | `/api/products/:id` | Sí | cualquiera | Obtiene un producto por ID |
| `POST` | `/api/products` | Sí | `encargado` | Crea un nuevo producto |
| `PUT` | `/api/products/:id` | Sí | `encargado` | Actualiza un producto |
| `DELETE` | `/api/products/:id` | Sí | `admin` | Elimina un producto |

### Incidencias — `/api/incidences`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/incidences` | Sí | cualquiera | Lista todas las incidencias |
| `GET` | `/api/incidences/order/:orderId` | Sí | cualquiera | Lista incidencias de un pedido |
| `GET` | `/api/incidences/:id` | Sí | cualquiera | Obtiene una incidencia por ID |
| `POST` | `/api/incidences` | Sí | cualquiera | Crea una nueva incidencia |
| `PATCH` | `/api/incidences/:id/status` | Sí | `encargado` | Actualiza el estado de una incidencia |

### Empleados — `/api/employees`

| Método | Ruta | Auth | Rol mínimo | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/employees` | Sí | `encargado` | Lista todos los empleados |

### Health check

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Comprueba que el servidor está activo |

---

## Licencia

ISC
