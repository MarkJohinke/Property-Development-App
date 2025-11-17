# Property Development Analysis Tool

This workspace hosts a Next.js 14 application that helps Johinke Development analyse New South Wales properties by aggregating zoning, Transport Oriented Development (TOD) insights, feasibility metrics, and comparable sales into a single site report. The UI is tailored for desktop stakeholders and is backed by a serverless API route that stitches together open-government ArcGIS datasets and Google services.

## Current Status
✅ **The app is working!** The application has been successfully configured and tested.

- Frontend address search and reporting experience is implemented in `components/AddressSearch.tsx` as a client component with Google Places autocomplete, fallbacks for when Maps fails to load, and rich report rendering (maps, tables, recommendations, glossary).
- The landing page wraps the search UI and presents marketing copy from `app/page.tsx`; shared layout is defined in `app/layout.tsx`.
- Data is sourced through the Next.js Route Handler at `app/api/nswPlanningAtPoint/route.ts`, which currently performs live lookups (Nominatim geocoding, NSW LotSearch, SEPP Housing layers, Google Street View metadata) but ultimately returns a curated sample payload that blends remote signals with mocked feasibility figures.
- Google Maps JavaScript API loading is centralised in `lib/googleMaps.ts` to avoid duplicate initialisation and to support library switching.
- A legacy `backend/` directory remains with only environment placeholders (`backend/.env.example`); the FastAPI service referenced in `AGENTS.md` is not present.
- Build artifacts and temporary files have been cleaned up and added to `.gitignore`.
- All dependencies are installed and security vulnerabilities have been fixed with `npm audit fix`.
- Link integrity checks from `hyperlink_check_results.csv` confirm NSW planning references were reachable during the last audit.

## Workspace Layout
```
property-dev-app/
├── app/                   # Next.js App Router entry points and API routes
│   ├── api/              # API routes (nswPlanningAtPoint)
│   ├── layout.tsx        # Root layout component
│   └── page.tsx          # Landing page
├── components/            # React components (primary: AddressSearch)
├── lib/                   # Shared utilities (Google Maps loader)
├── public/                # Static assets (Johinke brand marks)
├── backend/               # Placeholder for deprecated FastAPI service
├── .next/                 # Next.js build output (gitignored)
├── node_modules/          # Dependencies (gitignored)
├── .env.local.example     # Example environment variables
├── package.json           # Project metadata and scripts
└── README.md              # This file
```

## Getting Started
1. **Install Node.js 18+** (align with Next.js 15 requirements).
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment variables** (optional but recommended for full functionality):
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your Google Maps API key
   ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.
5. **Lint your code:**
   ```bash
   npm run lint
   ```
6. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

## Environment Variables
| Variable | Location | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `.env.local` | Loads the Google Maps JavaScript API for autocomplete, maps, and Street View. **Optional** - the app works without it but will show static imagery instead of interactive maps. Get your API key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/). |

## External Services & Data Sources
- **Google Maps Platform**: Places Autocomplete (`components/AddressSearch.tsx`), Maps JS API and Street View metadata checks (`lib/googleMaps.ts`, `app/api/nswPlanningAtPoint/route.ts`).
- **OpenStreetMap / Nominatim**: Geocoding fallback when no parcel centroid is available (`app/api/nswPlanningAtPoint/route.ts`).
- **NSW Government ArcGIS services**: Lot dimensions, zoning labels, SEPP Housing layers, town centre polygons (`app/api/nswPlanningAtPoint/route.ts`).
- **OSRM**: Routing metadata reserved for future travel-time calculations (`app/api/nswPlanningAtPoint/route.ts`).
- **Planning legislation PDFs/URLs**: Linked throughout the rendered report and validated via `hyperlink_check_results.csv`.

## Development Notes & Next Steps
- Break down `components/AddressSearch.tsx` into focused subcomponents/hooks to improve maintainability and enable testing.
- Replace the hard-coded `sample` response in `app/api/nswPlanningAtPoint/route.ts` with real aggregation output once upstream data parity is verified; add caching or rate limiting for the NSW ArcGIS endpoints.
- Update `AGENTS.md` so that contributor guidance matches the single-frontend layout, or relocate backend documentation to the appropriate repository.
- Add automated tests (unit for formatting helpers, integration for the API route once real data is returned) and consider smoke tests that exercise an end-to-end address lookup.

## Additional Resources
- Branding assets: `Johinke Logo.png`, `public/johinke-logo.svg`.
- Contact info and planning guidelines remain in `AGENTS.md`; update any email/URL references before inviting collaborators.

