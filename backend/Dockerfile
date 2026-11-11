# syntax=docker/dockerfile:1

# Imagem da API (NestJS). Multi-stage: compila numa etapa e leva para a final
# só o JavaScript compilado e as dependências de produção.
#   docker build -t saude-unificada-api ./backend

ARG NODE_VERSION=24

# 1) Compila o TypeScript
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: não baixa o MongoDB do mongodb-memory-server (só os testes usam)
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# 2) Só as dependências de produção
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# 3) Imagem final: enxuta e sem rodar como root
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Pasta do driver de arquivos local (em produção os arquivos vão para o S3)
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
# Mesmo endpoint do health check do load balancer na AWS (não depende do banco)
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health/live').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "dist/main.js"]
