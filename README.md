# Catálogo del Taller

Aplicación web con **login** y **catálogo de piezas** (familias, descripción, precio e imágenes múltiples). Permite dar de alta piezas desde el navegador y, en móvil (Android/iPhone), añadir fotos desde **cámara** o **galería**.

## Ejecutar en local (Windows)

En `web/`:

```bash
npm install
npx prisma migrate dev
npm run dev
```

Abre `http://localhost:3000`.

- **Primer arranque**: entra en `/setup` para crear el usuario administrador.
- Luego inicia sesión en `/login`.

## Datos

- **Base de datos**: SQLite (por defecto `web/dev.db` en desarrollo).
- **Imágenes**: se guardan en `web/public/uploads` (URLs como `/uploads/...`).

## Despliegue en servidor (Docker)

Requisitos: Docker instalado (en un VPS/servidor o en tu PC).

En la raíz del proyecto:

```bash
cp .env.example .env
# edita .env y ajusta PUBLIC_URL / NEXTAUTH_SECRET / NEXTAUTH_URL
docker compose up -d --build
```

Abre `https://TU_DOMINIO` (si configuras dominio) o `http://IP_DEL_SERVIDOR` (Caddy expone 80/443).

Persistencia:
- **BD**: carpeta `./data` (montada en `/data`).
- **Imágenes**: carpeta `./uploads` (montada en `/app/public/uploads`).

### Importante (producción)

- Cambia `NEXTAUTH_SECRET` en `.env`.
- Ajusta `PUBLIC_URL`/`NEXTAUTH_URL` a tu dominio (por ejemplo `https://catalogo.midominio.com`).

