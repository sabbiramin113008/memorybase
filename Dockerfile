# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ─── Stage 2: Python backend + frontend dist ──────────────────────────────────
FROM python:3.11-slim AS backend

# Non-root user for security
RUN groupadd -r agentdock && useradd -r -g agentdock agentdock

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy compiled frontend into static dir
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Persistent data directory (SQLite file lives here when mounted)
RUN mkdir -p /app/data && chown agentdock:agentdock /app/data

# Environment defaults (can be overridden at runtime)
ENV DATABASE_URL=sqlite:////app/data/agentdock.db \
    STATIC_DIR=/app/frontend/dist \
    HOST=0.0.0.0 \
    PORT=8000

USER agentdock

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host $HOST --port $PORT"]
