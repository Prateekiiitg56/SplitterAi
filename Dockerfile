# Backend (agent engine) image, deployed to Render by render.yaml. The dashboard goes on Vercel
# (vercel.json). See "Deploying" in README.md.
FROM node:22-bookworm-slim AS node

# The full Python image already has git (GitHub integration). No Chromium: it does not fit in
# Render's free 512 MB, so the agents' browser_check reports an error instead of running.
FROM python:3.12-bookworm

# Agents install and build web projects with npm (Vite needs Node 20.19+).
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend

# Everything the server writes goes under /data (sessions DB, keys, run history, projects).
RUN mkdir -p /data && ln -s /data/workspace_output /app/workspace_output
ENV HOME=/data \
    SPLITTER_HISTORY_PATH=/data/.agentcli/history.jsonl \
    SPLITTER_ENV=production \
    FORWARDED_ALLOW_IPS=* \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
