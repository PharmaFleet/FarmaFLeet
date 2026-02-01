# Vercel + Supabase + Upstash Deployment Plan

## Overview

This document outlines the comprehensive step-by-step plan to deploy the PharmaFleet application using a modern serverless stack:

- **Frontend**: Vercel (React + Vite)
- **Backend**: Vercel (FastAPI serverless functions)
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Caching**: Upstash (Redis)

## 1. Project Setup & Prerequisites

- [x] **Supabase Project Creation**
  - Create a new project on [supabase.com](https://supabase.com)
  - Region: Choose one close to your users (e.g., Frankfurt or London)
  - Save `SUPABASE_URL`, `SUPABASE_KEY` (Anon), and `DATABASE_URL` (Transaction pooler preferred)
  - **Action**: Enable `postgis` extension in Supabase dashboard (Database -> Extensions).
    Supabase Database Password: Pharmafleet0101
    Supabase URL: https://ubmgphjlpjovebkuthrf.supabase.co
    Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibWdwaGpscGpvdmVia3V0aHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Mzg4NDksImV4cCI6MjA4NTUxNDg0OX0.5qw8N0vv8FwSsYPqRRubL2WXyUn3ZX08YjhHl2torT8
    Database URL: postgresql://postgres.ubmgphjlpjovebkuthrf:Pharmafleet0101@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
- [x] **Upstash Redis Creation**
  - Create a database on [upstash.com](https://upstash.com)
  - Region: ideally same as Supabase (AWS eu-central-1 if possible)
  - Save `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the `redis://` connection string).
    UPSTASH_REDIS_REST_URL: rediss://default:AfMdAAIncDE0NmU4M2JiZTlmZmI0MzliYjM0MDc5YjFhNzExY2VkY3AxNjIyMzc@touching-cattle-62237.upstash.io:6379
    UPSTASH_REDIS_REST_TOKEN: AfMdAAIncDE0NmU4M2JiZTlmZmI0MzliYjM0MDc5YjFhNzExY2VkY3AxNjIyMzc
- [x] **Vercel Project Setup**
  - Create simple Vercel projects (can use CLI later or Dashboard).
  - Prepare to link GitHub repository.

## 2. Backend Foundation (Vercel Adaptation)

The current FastAPI app runs as a long-running container. Vercel runs it as serverless functions.

- [ ] **Dependency Update** (`backend/requirements.txt`)
  - [ ] Add `mangum` (Adapter for running ASGI apps on Vercel/Lambda) or verify Vercel Python runtime requirements.
  - [ ] Ensure `psycopg2-binary` is compatible or use `psycopg2` (Vercel has prebuilt binaries).

- [ ] **Vercel Configuration** (`vercel.json`)
  - [ ] Create `vercel.json` in root (or separate if monorepo structure allows).
  - [ ] Configure `rewrites` to route `/api/*` to `backend/api/index.py` (or adapter).
  - [ ] Configure `build` settings for Python.

- [ ] **Entrypoint Creation**
  - [ ] Create `backend/api/index.py` (Vercel entrypoint) that wraps `app` with `Mangum` handler is a common pattern, OR use Vercel's native FastAPI support.
  - _Recommendation_: Use standard `vercel.json` builds with `app` entrypoint.

- [ ] **Environment Variables Mapping**
  - Map `POSTGRES_SERVER`, `POSTGRES_USER`, etc., to Supabase connection strings.
  - Map `REDIS_URL` to Upstash.

## 3. Database Migration (PostGIS & Data)

- [ ] **Schema Migration**
  - [ ] Use `alembic` to generate migration scripts if not up to date.
  - [ ] Run migrations against Supabase using connection string.
  - _Alternative_: Dump local schema `pg_dump -s` and import to Supabase SQL Editor.

- [ ] **Data Seeding**
  - [ ] Export local data (users, drivers, etc.).
  - [ ] Import to Supabase (be careful with PostGIS binary formats, use HEX if transferring via SQL).

## 4. Feature-Specific Backend (Redis & CORS)

- [ ] **Redis Client Update** (`backend/app/core/cache.py`)
  - [ ] Verify `redis.asyncio` works well with Upstash (it usually does).
  - _Optional_: Switch to `@upstash/redis` HTTP client if connection pooling issues arise in serverless environment.

- [ ] **CORS Configuration**
  - [ ] Update `backend/app/main.py` to allow the Vercel Frontend Production Domain.

## 5. Frontend Foundation

- [ ] **Environment Variables**
  - [ ] Set `VITE_API_URL` to the Vercel Backend URL (relative `/api/v1` if on same domain, or absolute).
  - [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if using Supabase Client directly in frontend.

- [ ] **Build Configuration**
  - [ ] Ensure `vite build` output (`dist/`) is correctly detected by Vercel.
  - [ ] Settings: Framework Preset = Vite. Root Directory = `frontend`.

## 6. Deployment Strategy (Monorepo)

Since Frontend and Backend are in the same repo:

- [ ] **Root Config**
  - Configure Vercel to have ONE project for Frontend.
  - Configure a SECOND project for Backend (or use Rewrites in a single project).
  - _Single Project Approach_: Deploy root as the project. Configure `vercel.json` to have:
    - Frontend static files served.
    - `/api` requests routed to `backend`.
    - Build script handles both or Vercel "Framework" handles frontend and "Functions" handle backend.
  - _Recommended_: **Root configuration** in `vercel.json` handling both is cleanest for sharing domains.

## 7. Execution Steps for "The Agent" (Me)

1. **Create `vercel.json`** with `builds`, `routes`, and `rewrites` logic.
2. **Update `backend/requirements.txt`**.
3. **Notify User** to provide Supabase/Upstash credentials.
4. **Run Database Migration** (using Supabase MCP if allowed, or script).
5. **Verify Locally** (simulate Vercel environment if possible).

## 8. Verification Plan

- [ ] **Vercel Preview Deployment**: Check build logs.
- [ ] **API Health Check**: `/api/v1/utils/health-check` returning 200.
- [ ] **Database Connectivity**: Login flow works (reads User table).
- [ ] **Redis Connectivity**: Caching works (fast repeat requests).
- [ ] **Frontend**: Loads, calls API, displays map (requires Google Maps Key in Vercel Env).

## 9. Risks & Mitigations

### 9.1 Database Connection Exhaustion (Critical)

- **Risk**: Serverless functions (Vercel) scale horizontally, creating a new DB connection for every concurrent request. This can quickly hit the max connection limit of PostgreSQL (e.g., 100 connections), causing `FATAL: remaining connection slots are reserved` errors.
- **Mitigation 1 (Supabase Transaction Pooler)**: **MANDATORY**. You must use the Supabase **Transaction Pooler** (Supavisor) on port `6543`. Do **NOT** use the direct connection (port `5432`) for the Vercel backend.
- **Mitigation 2 (SQLAlchemy Configuration)**: Configure SQLAlchemy with `pool_size=0` and `max_overflow=-1` (NullPool) because the connection pooling is handled by Supabase, not the application side in a serverless environment.

### 9.2 Serverless Cold Starts & Latency

- **Risk**: Python runtimes on Vercel can take 1-3 seconds to "boot" (Cold Start) if the function hasn't been called recently. This adds latency to the first request.
- **Mitigation**:
  - Keep the application bundle small (remove dependencies like `pandas` if possible, or use lightweight alternatives).
  - Use Vercel's **Edge Caching** (CDN) for read-heavy endpoints where possible.
  - Accept that the first request after idle time will be slightly slower (usually acceptable for a dashboard).

### 9.3 Execution Timeouts (Vercel Limits)

- **Risk**: Vercel Hobby plan has a **10-second** timeout. Pro plan has **60 seconds**. If a geospatial query or report generation takes longer, the request will be hard-terminated.
- **Mitigation**:
  - Optimize SQL queries using proper PostGIS indexes (`GIST`).
  - Offload long-running tasks (e.g., "Generate Weekly PDF") to a background worker, or a scheduled Vercel Cron Job, or use Supabase **Edge Functions** for specific heavy tasks.

### 9.4 PostGIS & Binary Dependencies

- **Risk**: `geoalchemy2` and `shapely` often rely on system libraries (`libgeos`, `libgdal`) that might not be present or compatible in the Vercel AWS Lambda environment.
- **Mitigation**:
  - Use strict version pinning in `requirements.txt`.
  - Supabase handles the _database side_ of PostGIS perfectly.
  - On the _app side_, ensure we are only using `geoalchemy2` for SQL generation and not heavy geometric processing in Python. If heavy processing is needed, we might need to move that logic to the DB (PL/pgSQL functions).

### 9.5 Cost Management

- **Risk**: Serverless bills by execution time. An infinite loop in frontend calling the backend, or a DDoS attack, can cause costs to skyrocket.
- **Mitigation**:
  - Set up **Spend Management** limits in Vercel.
  - Configure **Rate Limiting** in `main.py` (which you already have!) and potentially use Vercel's Edge Config for global rate limiting.
