# Multi-stage Dockerfile para despliegue universal en cualquier hosting (VPS, Render, Railway, Fly.io, Cloud Run)
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar frontend (Vite) y servidor (esbuild)
RUN npm run build

# Imagen de producción ligera
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/dist ./dist
# Crear directorio de datos persistente
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
