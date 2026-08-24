Guide through deploying NeutaraDeployment to the server. This wraps this project's actual deploy mechanism (manual Docker Compose rebuild on the target host, no CI/CD pipeline exists) — gstack's `/land-and-deploy` doesn't know these specifics, so use this command for the real deploy, and `/land-and-deploy` only if it's been configured with this project's target host.

Run these steps in order:

1. Verify TypeScript compiles with no errors:
   ```bash
   cd backend && npx tsc --noEmit
   ```

2. Check for pending DB migrations in `backend/src/database/` that haven't been applied yet.

3. Confirm `.env` exists and has all variables from `.env.example` filled in.

4. Pull latest code and rebuild all Docker services:
   ```bash
   git pull origin main && sudo docker compose up -d --build
   ```

5. Watch backend startup logs to confirm migrations ran and server started:
   ```bash
   sudo docker compose logs -f backend
   ```

6. Verify the API is healthy:
   ```bash
   curl http://localhost:3200/api/v1/health
   ```

7. Open the frontend at `http://localhost:3201` and confirm login works.

$ARGUMENTS
