# Repository Guidelines

## Project Structure & Module Organization
- Monorepo: `backend/` (FastAPI), `frontend/` (Next.js), `scripts/`.
- Python code in `backend/app/`, tests in `backend/tests/`. Frontend pages in `frontend/pages/`.

## Build, Test, and Development Commands
- Backend (Docker): `docker compose up -d backend` (serves on `:8000`).
- Frontend: `cd frontend && npm install && npm run dev` (serves on `:3000`).
- Backend tests (local Python, if installed): `cd backend && pytest -q`.

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indent, <=100 cols, type hints for public APIs.
- JS/React: Prettier-style formatting, functional components, hooks.
- Naming: `snake_case` (py), `camelCase` (js), `PascalCase` for classes/components.

## Testing Guidelines
- Backend: `pytest`; mirror paths under `backend/tests/` (files `test_*.py`).
- Frontend: optional `vitest`/`jest` later. Keep UI logic pure and testable.

## Commit & Pull Request Guidelines
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Reference issues in bodies.
- PRs: small, focused; include description, steps to test, and screenshots if UI changes.

## Security & Config
- Never commit secrets. Use `backend/.env` and `frontend/.env.local` (provide `*.example`).
- Restrict CORS to known origins in production.
