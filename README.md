# Portal de KPIs y Bonos para Estaciones de Servicio

Portal de gestion, analitica operacional y calculo de bonos operacionales para estaciones
de servicio (gasolineras), organizado en una jerarquia Empresa -> Zona -> Estacion.

## Stack

- **Backend:** Node.js 22 + TypeScript + Fastify + Kysely + pg-boss
- **Base de datos:** PostgreSQL 17
- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4
- **Reportes:** PDFKit (PDF) y ExcelJS (XLSX)
- **Infraestructura:** Docker Compose, pensado para Rocky Linux

## Estructura del monorepo

```text
encuesta/
  db/
    migrations/        # Migraciones SQL (dbmate)
    seeds/             # Rubros base + usuario admin inicial
  packages/shared/      # Zod schemas, tipos y motor de bonos puro compartidos
  apps/api/             # Fastify API + worker de sincronizacion (pg-boss)
  apps/web/             # Frontend React (Vite + Tailwind v4)
  docker-compose.yml
```

Ver el plan de arquitectura completo en `.cursor/plans/` para el detalle de cada tabla,
regla de negocio y fase de implementacion.

## Requisitos previos (Rocky Linux)

### 1. Instalar Docker Engine + Compose plugin

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # cerrar sesion y volver a entrar para aplicar
```

Alternativa sin `docker-ce` (por ejemplo en entornos restringidos): `podman` +
`podman-compose`, disponibles en los repos base de Rocky Linux:

```bash
sudo dnf install -y podman podman-compose
# los comandos de este README funcionan igual sustituyendo "docker compose" por "podman-compose"
```

### 2. Abrir el puerto del frontend en el firewall

Por defecto la app web se publica en el puerto `8080` (ver `WEB_PORT` en `.env`).

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### 3. SELinux y volumenes

Rocky Linux trae SELinux en modo `enforcing` por defecto. Los volúmenes montados en
`docker-compose.yml` (datos de PostgreSQL, migraciones) ya incluyen el sufijo `:Z`,
que indica a Docker que reetiquete el contenido para el contenedor. No se requiere
deshabilitar SELinux.

### 4. Preparar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y completar como minimo:

```bash
# Contraseña fuerte para PostgreSQL
POSTGRES_PASSWORD=...

# Clave maestra de cifrado (AES-256-GCM) para las credenciales de integraciones
APP_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Secreto de firma de JWT
JWT_ACCESS_SECRET=$(openssl rand -hex 32)

# Origen permitido para CORS (dominio publico del frontend)
CORS_ORIGIN=https://portal.tuempresa.com
```

**Importante:** `APP_ENCRYPTION_KEY` y `JWT_ACCESS_SECRET` no deben perderse ni
rotarse sin plan de migracion: la primera cifra las credenciales de integraciones
guardadas en PostgreSQL y la segunda firma las sesiones activas.

## Despliegue

```bash
# 1. Generar package-lock.json una vez (requiere Node 22 y acceso a npm registry)
npm install

# 2. Construir imagenes y levantar todos los servicios
docker compose build
docker compose up -d

# 3. Verificar que las migraciones corrieron sin error
docker compose logs migrate

# 4. Cargar los datos iniciales (5 rubros + usuario admin)
docker compose run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SEED_ADMIN_EMAIL="$SEED_ADMIN_EMAIL" \
  -e SEED_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD" \
  api node --experimental-strip-types /app/db/seeds/run.ts
```

La app queda disponible en `http://<servidor>:8080`. Inicia sesion con el correo y
password definidos en `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` y cambialos de
inmediato desde el modulo de administracion.

### Servicios

| Servicio  | Descripcion                                              | Expuesto al host |
|-----------|-----------------------------------------------------------|-------------------|
| `db`      | PostgreSQL 17                                              | No                |
| `migrate` | Aplica migraciones con `dbmate` y termina                  | No                |
| `api`     | API Fastify                                                | No (via `web`)    |
| `worker`  | Worker de sincronizacion (pg-boss + cron)                  | No                |
| `web`     | nginx sirviendo el build de Vite y proxy de `/api`         | Si (`WEB_PORT`)   |

### Comandos utiles

```bash
docker compose ps                     # estado de los servicios
docker compose logs -f api            # logs de la API
docker compose logs -f worker         # logs de sincronizacion con fuentes externas
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"  # consola SQL
docker compose down                   # detener todo (conserva el volumen db_data)
```

### Migraciones

Las migraciones viven en `db/migrations/` y se aplican con
[dbmate](https://github.com/amacneil/dbmate) desde el servicio `migrate`. Para
generar una nueva migracion desde el host (con `dbmate` instalado localmente o via
Docker):

```bash
docker run --rm -v "$PWD/db/migrations:/db/migrations" ghcr.io/amacneil/dbmate:2 new nombre_migracion
```

## Integraciones externas

Las credenciales de integracion (Google Forms/Sheets, Nexus Fuel, Nomina 3, SISPA) se
administran desde `/admin/integrations` (API: `/api/admin/integrations/credentials`).
El secreto se cifra en reposo con AES-256-GCM usando `APP_ENCRYPTION_KEY` y nunca se
devuelve por la API una vez guardado; solo se descifra en memoria, dentro del proceso
`worker`, al momento de ejecutar una sincronizacion o probar la conexion.

El servicio `worker` usa `pg-boss` (sin Redis) para programar una cola dedicada por
credencial segun su `cron_expression`; cada ejecucion queda registrada en `sync_runs` /
`sync_run_logs` con reintentos automaticos (backoff exponencial, 3 intentos). Editar el
cron o desactivar una credencial desde el admin se refleja en el worker sin reiniciarlo
(se reconcilia cada 5 minutos).

Contrato esperado de cada proveedor (`apps/api/src/services/integrations/`):

- **Nexus Fuel / Nomina 3 / SISPA** (`restKpiAdapter.ts`): REST autenticado con
  `Authorization: Bearer <secret>` sobre `config.baseUrl`. Se espera un arreglo JSON
  `[{ stationExternalId, kpiCode, period, value }, ...]`; los `stationExternalId` se
  resuelven contra `station_external_refs` y `kpiCode` contra `kpi_categories.code`.
  Si el API real de un proveedor entrega otro formato, agregar un mapeo delgado antes
  de este contrato (la logica de auth, reintentos, idempotencia y logging ya esta
  resuelta y es reutilizable).
- **Google Forms** (`googleForms.ts`): lee una hoja de Google Sheets vinculada al
  formulario via una cuenta de servicio (el secreto es el JSON completo de la
  credencial, `config.spreadsheetId` / `config.sheetName` identifican la hoja). Se
  esperan las columnas `station_external_id`, `submitted_at`, `respondent_email`,
  `score`; el resto de columnas se guardan como respuestas crudas en
  `survey_responses.answers` y `score` se promedia por estacion/periodo para alimentar
  el rubro `survey_score`.

## Modulo de administracion y reportes

`/admin` (solo rol `admin`) agrupa cuatro pestanas: **Organizacion** (alta y
activacion de empresas, zonas y estaciones), **Usuarios** (alta con rol y alcance
jerarquico, reinicio de contrasena, cierre forzado de sesion), **Integraciones**
(vease la seccion anterior) y **Reglas de bono** (alta de una nueva version de
`goal_rule_sets`/`goal_rules` con validacion en vivo de que los pesos sumen 100%;
las reglas nunca se editan, solo se versiona).

La pestana **Reportes** (y `GET /api/reports/stations`) arma, para cada estacion
visible al usuario, el desglose de bono del periodo seleccionado reutilizando el
mismo motor de calculo del cierre de periodo. Desde ahi se exporta:

- **PDF** (`GET /api/reports/stations.pdf`, PDFKit): encabezado institucional,
  desglose de KPIs con semaforo por estacion y totales de bolsa/bono.
- **Excel** (`GET /api/reports/stations.xlsx`, ExcelJS): hoja "Resumen" con
  formulas `SUM` para los totales y hoja "Detalle por rubro" con el avance y pago
  de cada KPI por estacion.

## Respaldo y recuperacion

Programar un respaldo diario con `pg_dump` fuera del contenedor, por ejemplo con
`cron` en el host:

```bash
# /etc/cron.d/portal-bonos-backup
0 3 * * * root docker compose -f /opt/portal-bonos/docker-compose.yml exec -T db \
  pg_dump -U portal portal_bonos | gzip > /var/backups/portal-bonos/$(date +\%F).sql.gz
```

Mantener copias fuera del servidor (rsync/S3) y probar la restauracion periodicamente:

```bash
gunzip -c backup.sql.gz | docker compose exec -T db psql -U portal -d portal_bonos
```

## Desarrollo local (sin Docker)

```bash
npm install
cp .env.example .env   # ajustar DATABASE_URL a localhost

# Levantar solo PostgreSQL en Docker y correr API/worker/web en local
docker compose up -d db
npm run db:migrate
npm run db:seed

npm run dev:api      # http://localhost:3000
npm run dev:web      # http://localhost:5173
```

## Pruebas

```bash
npm run test           # unit tests (motor de bonos, servicios)
npm run typecheck      # TypeScript estricto en todos los workspaces
```
