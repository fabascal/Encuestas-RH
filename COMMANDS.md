# Comandos

## Setup

```bash
sudo dnf install -y podman-compose   # una sola vez
cp .env.example .env   # editar valores antes de levantar
npm install
```

## Migrar DB

```bash
podman-compose up -d db
npm run db:migrate      # aplica migraciones (dbmate up)
npm run db:rollback     # revierte ultima migracion
npm run db:new nombre   # crea migracion nueva
npm run db:seed         # rubros base + usuario admin
```

Docker (sin dbmate local):

```bash
podman-compose run --rm migrate
```

## Levantar (produccion, Docker Compose)

```bash
podman-compose build
podman-compose up -d
```

## Levantar (desarrollo local, sin Docker para api/web)

```bash
podman-compose up -d db
npm run dev:api    # http://localhost:3000
npm run dev:web    # http://localhost:5173
```

Worker en dev:

```bash
npm run dev:worker --workspace=apps/api
```

## Detener

```bash
podman-compose stop        # detiene, conserva contenedores
podman-compose down        # detiene y elimina contenedores (conserva volumen db_data)
podman-compose down -v     # elimina TAMBIEN el volumen db_data (borra la BD)
```

## Estado

```bash
podman-compose ps
podman-compose top
```

## Logs

```bash
podman-compose logs -f api
podman-compose logs -f worker
podman-compose logs -f web
podman-compose logs -f db
podman-compose logs -f migrate
podman-compose logs -f          # todos los servicios
```

## Consola SQL

```bash
podman-compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## Build / typecheck / test / lint

```bash
npm run build
npm run typecheck
npm run test
npm run lint
```

## Respaldo / restauracion

```bash
podman-compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup.sql.gz
gunzip -c backup.sql.gz | podman-compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## Reiniciar un servicio

```bash
podman-compose restart api
podman-compose up -d --build api   # reconstruye imagen y reinicia
```
