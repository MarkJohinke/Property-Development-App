# Property Development Analysis Tool

This workspace hosts a Next.js 14 application that helps Johinke Development analyse New South Wales properties by aggregating zoning, Transport Oriented Development (TOD) insights, feasibility metrics, and comparable sales into a single site report. The UI is tailored for desktop stakeholders and is backed by a serverless API route that stitches together open-government ArcGIS datasets and Google services.

## Current Status
- Frontend address search and reporting experience is implemented in `components/AddressSearch.tsx:1` as a large client component with Google Places autocomplete, fallbacks for when Maps fails to load, and rich report rendering (maps, tables, recommendations, glossary).
- The landing page simply wraps the search UI and presents marketing copy from `app/page.tsx:1`; shared layout is defined in `app/layout.tsx:1`.
- Data is sourced through the Next.js Route Handler at `app/api/nswPlanningAtPoint/route.ts:1`, which currently performs live lookups (Nominatim geocoding, NSW LotSearch, SEPP Housing layers, Google Street View metadata) but ultimately returns a curated sample payload that blends remote signals with mocked feasibility figures.
- Google Maps JavaScript API loading is centralised in `lib/googleMaps.ts:1` to avoid duplicate initialisation and to support library switching.
- A legacy `backend/` directory remains with only environment placeholders (`backend/.env.example:1`); the FastAPI service referenced in `AGENTS.md:1` is not present.
- Build artefacts such as `.next/` and `chunk471.js:1` are checked in; clean/rebuild when packaging.
- Link integrity checks from `hyperlink_check_results.csv:1` confirm NSW planning references were reachable during the last audit.

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
1. Install Node.js 18+ (align with Next.js 14 requirements).
2. Install dependencies: `npm install`.
3. Copy `.env.local` (or use `backend/.env.example:1` as a pattern) and provide values listed below.
4. Run the dev server: `npm run dev` (served on `http://localhost:3000`).
5. Lint before committing: `npm run lint`. Build for production with `npm run build` followed by `npm run start`.

## Environment Variables
| Variable | Location | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `.env.local:1` | Loads the Google Maps JavaScript API for autocomplete, maps, and Street View. Required for full functionality. |

## External Services & Data Sources
- **Google Maps Platform**: Places Autocomplete (`components/AddressSearch.tsx:1`), Maps JS API and Street View metadata checks (`lib/googleMaps.ts:1`, `app/api/nswPlanningAtPoint/route.ts:1`).
- **OpenStreetMap / Nominatim**: Geocoding fallback when no parcel centroid is available (`app/api/nswPlanningAtPoint/route.ts:1`).
- **NSW Government ArcGIS services**: Lot dimensions, zoning labels, SEPP Housing layers, town centre polygons (`app/api/nswPlanningAtPoint/route.ts:1`).
- **OSRM**: Routing metadata reserved for future travel-time calculations (`app/api/nswPlanningAtPoint/route.ts:1`).
- **Planning legislation PDFs/URLs**: Linked throughout the rendered report and validated via `hyperlink_check_results.csv:1`.

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

