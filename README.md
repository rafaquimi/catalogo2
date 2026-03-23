# Catálogo del Taller

Aplicación web privada (con login) para gestionar un catálogo de piezas: familias, descripción, precio e imágenes múltiples. Permite dar de alta, editar y eliminar piezas desde el navegador, con soporte para añadir fotos desde PC, Android e iPhone (cámara o galería).

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                              │
│              Navegador / iPhone / Android                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                    VERCEL  (App)                            │
│                                                             │
│   Next.js 16  ·  App Router  ·  Server Actions             │
│   Autenticación: NextAuth.js                                │
│   ORM: Prisma 7 + adaptador PostgreSQL                      │
│   Procesado de imágenes: sharp (WebP, resize, auto-rotate)  │
└──────────┬──────────────────────────────┬───────────────────┘
           │ SQL (connection pooling)      │ S3-compatible API
┌──────────▼───────────────┐   ┌──────────▼───────────────────┐
│   SUPABASE               │   │   CLOUDFLARE R2              │
│   PostgreSQL             │   │   Almacenamiento de imágenes │
│   Base de datos          │   │   Sin coste de transferencia │
│   (AWS eu-west-1)        │   │   Acceso público por URL     │
└──────────────────────────┘   └──────────────────────────────┘
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | [Next.js 16](https://nextjs.org) — App Router, Server Components, Server Actions |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| Autenticación | NextAuth.js 4 (sesión con JWT, login por usuario/contraseña) |
| ORM | Prisma 7 con adaptador `@prisma/adapter-pg` |
| Validación | Zod 4 |
| Formularios | React Hook Form |
| Procesado de imagen | sharp (conversión a WebP, redimensionado a 1200 px, auto-rotación EXIF) |
| Cliente S3 | `@aws-sdk/client-s3` |

---

## Dónde está cada cosa

### Aplicación — Vercel
- URL de producción: `https://catalogo2-ruddy.vercel.app`
- Plataforma serverless, despliegue automático al hacer `git push` a `main`
- El código fuente está en la carpeta `web/`

### Base de datos — Supabase PostgreSQL
- Proveedor: Supabase (región AWS eu-west-1)
- ORM: Prisma con pooling de conexiones vía Transaction mode (puerto 6543)
- Las migraciones se aplican con `npx prisma db push` desde local

### Imágenes — Cloudflare R2
- Bucket de objetos compatible con S3, sin coste de transferencia de salida
- Las imágenes se suben como WebP (comprimidas y redimensionadas) desde el Server Action
- Se sirven directamente desde la URL pública del bucket (`R2_PUBLIC_URL`)

---

## Variables de entorno necesarias

Copia `.env.example` a `web/.env` y rellena los valores:

```env
# NextAuth
NEXTAUTH_SECRET=...          # Clave aleatoria (openssl rand -base64 32)
NEXTAUTH_URL=https://...     # URL pública de la app

# Supabase PostgreSQL
DATABASE_URL=postgresql://...    # Transaction mode  (puerto 6543)
DIRECT_URL=postgresql://...      # Session mode      (puerto 5432)

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...        # URL pública del bucket
```

---

## Estructura del proyecto

```
CATALOGOS3/
├── web/                        # Aplicación Next.js
│   ├── app/
│   │   ├── catalogo/           # Catálogo de piezas
│   │   │   ├── page.tsx        # Listado con búsqueda, filtro y ordenación
│   │   │   ├── CatalogClient.tsx  # Filtros dinámicos (cliente)
│   │   │   ├── CatalogCard.tsx    # Tarjeta con manejadores de fotos
│   │   │   ├── nueva/          # Alta de pieza nueva
│   │   │   └── [id]/           # Detalle y edición de pieza
│   │   │       ├── page.tsx
│   │   │       ├── editar/
│   │   │       └── ImageViewer.tsx
│   │   ├── login/              # Página de login
│   │   ├── setup/              # Creación del primer usuario admin
│   │   └── api/auth/           # Endpoints de NextAuth
│   ├── lib/
│   │   ├── prisma.ts           # Cliente Prisma (singleton)
│   │   └── r2.ts               # Cliente S3 para Cloudflare R2
│   ├── prisma/
│   │   └── schema.prisma       # Modelos: User, Family, Part, PartImage
│   ├── prisma.config.ts        # Config Prisma v7 (URL de migración)
│   └── next.config.ts          # Config Next.js (sharp, R2 domains, body limit)
├── .env.example                # Plantilla de variables de entorno
└── README.md                   # Este archivo
```

---

## Flujo de subida de imágenes

```
Usuario selecciona foto (PC / iPhone / Android)
        │
        ▼
NuevaPiezaForm / EditarPiezaForm  (Client Component)
  → muestra previsualización local (URL.createObjectURL)
        │
        ▼ FormData con File[]
Server Action (createPart / updatePart)
  → sharp: rotate() + resize(1200px) + webp(quality 82)
  → PutObjectCommand → Cloudflare R2
  → guarda URL pública en PostgreSQL (tabla PartImage)
        │
        ▼
Vercel redirect → página de detalle de la pieza
```

---

## Desarrollo local

Requisitos: Node.js 20+, cuenta Supabase y Cloudflare R2 configuradas.

```bash
# 1. Instalar dependencias
cd web
npm install

# 2. Configurar variables de entorno
cp ../.env.example .env
# editar .env con tus credenciales

# 3. Crear tablas en la base de datos
npx prisma db push

# 4. Arrancar en desarrollo
npm run dev
```

Abre `http://localhost:3000` → ve a `/setup` para crear el usuario administrador.

---

## Despliegue

El despliegue es automático: cualquier `git push` a `main` lanza un nuevo build en Vercel.

1. Vercel detecta cambios en `web/` (Root Directory configurado a `web`)
2. Ejecuta `npm install` → `prisma generate` (postinstall) → `next build`
3. Despliega las funciones serverless
4. Las variables de entorno están configuradas en el panel de Vercel
