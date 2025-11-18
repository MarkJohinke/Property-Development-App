# Property Development Analysis Tool

This workspace hosts a Next.js 15 application with FastAPI backend that helps Johinke Development analyse New South Wales properties by aggregating zoning, Transport Oriented Development (TOD) insights, Land & Environmental Court decisions, and planning data into a single site report.

## Current Status
- **Frontend**: Next.js 15 application with address search and comprehensive property reporting
- **Backend**: FastAPI service providing planning data APIs including:
  - Land zoning information from NSW ArcGIS services
  - Planning controls (FSR, height, lot size)
  - Land & Environmental Court (LEC) findings within 5km radius with Clause 4.6 variations
- **Maps**: Google Maps API integration with OpenStreetMap fallback
- **Data Sources**: Live lookups from Nominatim geocoding, NSW LotSearch, SEPP Housing layers, Google Street View
- **Note**: Some data (comparable sales, feasibility) still uses sample data pending full API integration

## Workspace Layout
```
property-dev-app/
├── app/                   # Next.js App Router entry points and API routes
├── components/            # React components (primary: AddressSearch)
├── lib/                   # Shared utilities (Google Maps loader)
├── public/                # Static assets (Johinke brand marks)
├── backend/               # Placeholder for deprecated FastAPI service
├── .next/                 # Pre-built Next.js output (safe to regenerate)
├── package.json           # Project metadata and scripts
└── AGENTS.md              # Legacy contributor guidelines
```

## Getting Started

### Option 1: Docker Compose (Recommended)
Run both backend and frontend together:
```bash
docker compose up
```
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Option 2: Local Development

#### Backend Setup
1. Install Python 3.11+
2. Create and activate virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure
5. Run backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
6. Run tests:
   ```bash
   pytest -v
   ```

#### Frontend Setup
1. Install Node.js 18+
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.local.example` to `.env.local` and configure Google Maps API key (optional)
4. Run dev server:
   ```bash
   npm run dev
   ```
   Served on http://localhost:3000
5. Lint and build:
   ```bash
   npm run lint
   npm run build
   npm run start
   ```

## Environment Variables

### Frontend (`.env.local`)
| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Optional | Google Maps JavaScript API for autocomplete, maps, and Street View. Falls back to OpenStreetMap if not provided. |
| `NEXT_PUBLIC_API_URL` | Optional | Backend API URL (defaults to Next.js API routes) |

**Getting a Google Maps API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Street View Static API
   - Maps Static API
4. Create credentials (API Key)
5. Add to `.env.local`

### Backend (`backend/.env`)
| Variable | Required | Purpose |
| --- | --- | --- |
| `ENVIRONMENT` | No | Environment name (development/staging/production) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: localhost:3000) |
| `GEOCODE_USER_AGENT` | No | User agent for geocoding requests |
| `NSW_PLANNING_ARCGIS_URL` | No | NSW Planning ArcGIS service URL |

## External Services & Data Sources
- **Google Maps Platform**: Places Autocomplete, Maps JS API, Street View (optional, with OpenStreetMap fallback)
- **OpenStreetMap / Nominatim**: Geocoding fallback and static maps when Google Maps unavailable
- **NSW Government ArcGIS services**: Lot dimensions, zoning labels, SEPP Housing layers, town centre polygons
- **OSRM**: Routing metadata for travel-time calculations
- **NSW Caselaw (planned)**: Land & Environmental Court decisions and Clause 4.6 variations
- **Planning legislation PDFs/URLs**: Linked throughout reports

## API Endpoints

### Backend API
The FastAPI backend provides these endpoints:

#### Health & Status
- `GET /health` - Health check
- `GET /api/status` - Service status and configuration

#### Planning Data
- `GET /api/planning/zoning?latitude={lat}&longitude={lon}` - Get land zoning information
- `GET /api/planning/controls?latitude={lat}&longitude={lon}` - Get FSR, height, lot size controls
- `GET /api/planning/lec-findings?latitude={lat}&longitude={lon}&radius_km=5&years_back=2` - Get Land & Environmental Court findings within radius

**Interactive API Documentation:** Visit http://localhost:8000/docs when backend is running

## Development Notes & Next Steps
- Break down `components/AddressSearch.tsx:1` into focused subcomponents/hooks to improve maintainability and enable testing.
- Replace the hard-coded `sample` response in `app/api/nswPlanningAtPoint/route.ts:1` with real aggregation output once upstream data parity is verified; add caching or rate limiting for the NSW ArcGIS endpoints.
- Audit and prune committed artefacts (`.next/`, backup copies like `components/AddressSearch.tsx.bak`) before release.
- Update `AGENTS.md:1` so that contributor guidance matches the single-frontend layout, or relocate backend documentation to the appropriate repository.
- Add automated tests (unit for formatting helpers, integration for the API route once real data is returned) and consider smoke tests that exercise an end-to-end address lookup.

## Additional Resources
- Branding assets: `Johinke Logo.png:1`, `public/johinke-logo.svg:1`.
- Feasibility workbook reference: `Nield Avenue Feasbility - Rev 25 (10.09.2025) SHORE PROJECTS.xlsx:1` (useful for cross-checking financial assumptions).
- Contact info and planning guidelines remain in `AGENTS.md:1`; update any email/URL references before inviting collaborators.

