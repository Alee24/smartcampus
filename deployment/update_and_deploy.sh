#!/bin/bash
# ------------------------------------------------------------
# update_and_deploy.sh – one‑click workflow for the Smart Campus repo
# ------------------------------------------------------------
# 1. LOCAL: Stage, commit and push any changes.
# ------------------------------------------------------------
read -p "Enter a short commit message: " COMMIT_MSG
if [[ -z "$COMMIT_MSG" ]]; then
  echo "Commit message cannot be empty. Abort."
  exit 1
fi

git add .

git commit -m "$COMMIT_MSG"
# If the branch has no upstream, set it automatically.
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  git push --set-upstream origin $(git rev-parse --abbrev-ref HEAD)
else
  git push
fi

# ------------------------------------------------------------
# 2. REMOTE (VPS): Pull latest code, rebuild containers, run migrations.
# ------------------------------------------------------------
# Adjust these variables if your deployment path or Docker compose file differ.
REMOTE_DIR="/home/ruict/gatepass"
COMPOSE_FILE="docker-compose.prod.yml"

echo "\n=== Pulling latest code on the VPS ==="
ssh ruict@smartcampus "cd $REMOTE_DIR && git pull origin $(git rev-parse --abbrev-ref HEAD)"

echo "\n=== Rebuilding Docker images & restarting services ==="
ssh ruict@smartcampus "cd $REMOTE_DIR && sudo docker-compose -f $COMPOSE_FILE up -d --build"

echo "\n=== Ensuring Geofence table exists (migration) ==="
ssh ruict@smartcampus "docker exec gatepass_backend python - <<'PY'
import asyncio
from app.database import engine
from sqlmodel import SQLModel
from app.models import GeofenceSetting
async def m():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
asyncio.run(m())
PY"

echo "\n✅ Update & deployment complete!"
