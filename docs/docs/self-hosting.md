# Self-Hosting

## Docker Compose (recommended)

The easiest way to run MemoryBase in production is Docker Compose.

### 1. Create a directory

```bash
mkdir memorybase && cd memorybase
```

### 2. Create `docker-compose.yml`

```yaml
services:
  memorybase:
    image: ghcr.io/sabbiramin113008/memorybase:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    env_file: .env
    restart: unless-stopped
```

### 3. Create `.env`

```dotenv
MEMORYBASE_API_KEY=your-strong-secret-key
DATABASE_URL=sqlite:////app/data/memorybase.db
```

### 4. Start

```bash
docker compose up -d
```

---

## PostgreSQL Setup

For production, use PostgreSQL instead of SQLite:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: memorybase
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: memorybase
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  memorybase:
    image: ghcr.io/sabbiramin113008/memorybase:latest
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://memorybase:secret@db:5432/memorybase
      MEMORYBASE_API_KEY: your-strong-secret-key
    depends_on:
      - db
    restart: unless-stopped

volumes:
  pgdata:
```

---

## Nginx Reverse Proxy

To run MemoryBase behind Nginx with HTTPS:

```nginx
server {
    listen 80;
    server_name memorybase.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name memorybase.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/memorybase.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/memorybase.yourdomain.com/privkey.pem;

    # SSE requires buffering to be off
    proxy_buffering off;
    proxy_cache off;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for SSE
        proxy_read_timeout 86400s;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

!!! warning "SSE and buffering"
    Server-Sent Events require `proxy_buffering off`. Without this, real-time updates will not reach clients behind Nginx.

---

## Updating

```bash
# Pull the latest image
docker compose pull

# Restart with zero downtime
docker compose up -d --no-deps memorybase
```

Database migrations are handled automatically on startup — no manual steps required.
