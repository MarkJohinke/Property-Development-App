# Recommended Folder Structure for Data Modules

This document outlines the recommended repository organization for implementing the NSW Property Intelligence data architecture.

---

## Overview

The folder structure separates concerns across data acquisition, processing, computation engines, and output generation. This modular approach enables independent development, testing, and maintenance of each component.

---

## Proposed Directory Structure

```
Property-Development-App/
│
├── docs/                           # Documentation (this folder)
│   ├── DATA_ARCHITECTURE.md        # Main architecture overview
│   ├── ARCHITECTURE_FLOW.md        # Visual flow diagrams
│   ├── FOLDER_STRUCTURE.md         # This file
│   └── PARCEL_ANALYSIS_SCHEMA.json # JSON schema definitions
│
├── backend/                        # Backend computation engine
│   ├── app/                        # FastAPI application
│   │   ├── main.py                 # Application entry point
│   │   ├── api/                    # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── geocode.py          # Address to coordinates
│   │   │   ├── parcel.py           # Parcel lookup endpoints
│   │   │   └── analysis.py         # Main analysis endpoint
│   │   │
│   │   ├── models/                 # Data models (Pydantic)
│   │   │   ├── __init__.py
│   │   │   ├── parcel.py           # Parcel data structures
│   │   │   ├── analysis.py         # Analysis result models
│   │   │   └── planning.py         # Planning rule models
│   │   │
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── cadastre/           # Cadastre services (Section 1)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dcdb_client.py  # NSW DCDB API client
│   │   │   │   └── parcel_fetch.py # Parcel geometry retrieval
│   │   │   │
│   │   │   ├── geometry/           # Geometry Engine (Section 2)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── boundary.py     # Boundary calculations
│   │   │   │   ├── frontage.py     # Frontage/depth analysis
│   │   │   │   ├── corner.py       # Corner lot detection
│   │   │   │   └── slope.py        # Slope calculations
│   │   │   │
│   │   │   ├── spatial/            # Spatial Relationships (Section 3)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── adjacency.py    # Adjacent parcel analysis
│   │   │   │   ├── buffers.py      # Walkable buffers (TOD)
│   │   │   │   └── roads.py        # Road network analysis
│   │   │   │
│   │   │   ├── admin/              # Administrative Layers (Section 4)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── lga.py          # LGA lookup
│   │   │   │   ├── locality.py     # Suburb/locality
│   │   │   │   └── precinct.py     # DCP precinct mapping
│   │   │   │
│   │   │   ├── derived/            # Derived Data (Section 6)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── slope.py        # DEM-based slope analysis
│   │   │   │   ├── envelope.py     # Building envelope modelling
│   │   │   │   └── solar.py        # Solar access calculations
│   │   │   │
│   │   │   ├── constraints/        # Constraints & Hazards (Section 7)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── bushfire.py     # Bushfire prone land
│   │   │   │   ├── flood.py        # Flood planning
│   │   │   │   ├── heritage.py     # Heritage overlays
│   │   │   │   └── environmental.py # Environmental constraints
│   │   │   │
│   │   │   ├── compliance/         # Compliance Engine (Custom)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── cdc.py          # Complying Development
│   │   │   │   ├── da.py           # DA requirements
│   │   │   │   ├── lmr.py          # Low Rise Medium Density
│   │   │   │   └── sepp.py         # SEPP checks
│   │   │   │
│   │   │   ├── feasibility/        # Feasibility Engine (Custom)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── fsr.py          # FSR calculations
│   │   │   │   ├── yield_calc.py   # Unit yield estimation
│   │   │   │   ├── envelope.py     # Envelope modelling
│   │   │   │   └── landscape.py    # Landscaping requirements
│   │   │   │
│   │   │   └── external/           # Optional Paid Services (Section 5)
│   │   │       ├── __init__.py
│   │   │       ├── title.py        # Title search integration
│   │   │       ├── sales.py        # Sales data (RP Data)
│   │   │       └── imagery.py      # Nearmap integration
│   │   │
│   │   ├── utils/                  # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── geospatial.py       # Spatial utilities
│   │   │   ├── caching.py          # Cache management
│   │   │   └── validators.py       # Input validation
│   │   │
│   │   └── config/                 # Configuration
│   │       ├── __init__.py
│   │       ├── settings.py         # Application settings
│   │       └── datasources.py      # Data source endpoints
│   │
│   ├── tests/                      # Backend tests
│   │   ├── __init__.py
│   │   ├── test_cadastre/          # Cadastre tests
│   │   ├── test_geometry/          # Geometry tests
│   │   ├── test_compliance/        # Compliance tests
│   │   └── test_integration/       # Integration tests
│   │
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Docker configuration
│   └── .env.example                # Environment variables template
│
├── frontend/                       # Frontend application (existing)
│   ├── app/                        # Next.js app directory
│   ├── components/                 # React components
│   ├── lib/                        # Frontend utilities
│   └── public/                     # Static assets
│
├── data/                           # Data storage (gitignored)
│   ├── cache/                      # Cached API responses
│   │   ├── cadastre/               # Cached parcel data
│   │   ├── overlays/               # Cached planning overlays
│   │   └── dem/                    # Cached elevation tiles
│   │
│   ├── static/                     # Static reference data
│   │   ├── lgas/                   # LGA boundaries (GeoJSON)
│   │   ├── precincts/              # DCP precincts
│   │   └── constraints/            # Constraint layers
│   │
│   └── exports/                    # Generated reports
│       ├── reports/                # PDF/HTML reports
│       └── geojson/                # Exported geometries
│
├── scripts/                        # Utility scripts
│   ├── data_update/                # Data refresh scripts
│   │   ├── update_cadastre.py      # Refresh cadastre cache
│   │   ├── update_planning.py      # Update planning layers
│   │   └── update_constraints.py   # Refresh constraints
│   │
│   ├── testing/                    # Test data generators
│   │   ├── generate_test_parcels.py
│   │   └── mock_api_responses.py
│   │
│   └── deployment/                 # Deployment helpers
│       ├── setup_db.py             # Database initialization
│       └── health_check.py         # Service health checks
│
├── config/                         # Shared configuration
│   ├── datasources.json            # NSW data source endpoints
│   ├── planning_rules.json         # Planning rule definitions
│   └── compliance_matrix.json      # Compliance rule matrix
│
└── .github/                        # GitHub configuration
    ├── workflows/                  # CI/CD workflows
    │   ├── backend-tests.yml       # Backend test automation
    │   ├── frontend-build.yml      # Frontend build checks
    │   └── deploy.yml              # Deployment workflow
    │
    └── ISSUE_TEMPLATE/             # Issue templates
        ├── bug_report.md
        └── feature_request.md
```

---

## Module Descriptions

### `/backend/app/services/cadastre/` (Section 1)
**Purpose:** Interface with NSW DCDB to fetch parcel geometry and attributes.

**Key Files:**
- `dcdb_client.py` - API client for NSW Cadastre Web Service
- `parcel_fetch.py` - High-level parcel retrieval functions

**Dependencies:** `requests`, `shapely`, `geopandas`

---

### `/backend/app/services/geometry/` (Section 2)
**Purpose:** Compute survey-derived metrics from parcel geometry.

**Key Files:**
- `boundary.py` - Front/rear/side boundary calculations
- `frontage.py` - Frontage and depth measurements
- `corner.py` - Corner lot detection algorithms
- `slope.py` - Slope analysis from DEM data

**Dependencies:** `shapely`, `geopandas`, `numpy`, `rasterio`

---

### `/backend/app/services/spatial/` (Section 3)
**Purpose:** Spatial relationship calculations and buffer analysis.

**Key Files:**
- `adjacency.py` - Adjacent parcel identification
- `buffers.py` - Walkable buffer generation (TOD)
- `roads.py` - Road network proximity analysis

**Dependencies:** `geopandas`, `shapely`, `networkx` (optional)

---

### `/backend/app/services/admin/` (Section 4)
**Purpose:** Administrative boundary lookups and DCP mapping.

**Key Files:**
- `lga.py` - Local Government Area lookup
- `locality.py` - Suburb/locality identification
- `precinct.py` - DCP precinct mapping

**Dependencies:** `geopandas`, cached GeoJSON files

---

### `/backend/app/services/derived/` (Section 6)
**Purpose:** Development-relevant derived data and envelope modelling.

**Key Files:**
- `slope.py` - DEM-based slope metrics
- `envelope.py` - Building envelope calculations
- `solar.py` - Solar access and overshadowing

**Dependencies:** `rasterio`, `suncalc` (or custom), `shapely`

---

### `/backend/app/services/constraints/` (Section 7)
**Purpose:** Constraint and hazard overlay intersections.

**Key Files:**
- `bushfire.py` - Bushfire prone land checking
- `flood.py` - Flood planning level checks
- `heritage.py` - Heritage item/conservation area checks
- `environmental.py` - Environmental constraint checks

**Dependencies:** WMS/WFS clients, `geopandas`

---

### `/backend/app/services/compliance/` (Custom)
**Purpose:** Rule-based compliance checking for NSW planning pathways.

**Key Files:**
- `cdc.py` - Complying Development Certificate checks
- `da.py` - Development Application pathway
- `lmr.py` - Low Rise Medium Density SEPP
- `sepp.py` - Other SEPP checks

**Dependencies:** Custom rule engine, JSON rule definitions

---

### `/backend/app/services/feasibility/` (Custom)
**Purpose:** Development feasibility calculations and modelling.

**Key Files:**
- `fsr.py` - Floor Space Ratio calculations
- `yield_calc.py` - Unit yield estimation
- `envelope.py` - Building envelope modelling
- `landscape.py` - Deep soil and landscaping

**Dependencies:** Compliance results, geometry calculations

---

### `/backend/app/services/external/` (Optional - Section 5)
**Purpose:** Integration with paid third-party services.

**Key Files:**
- `title.py` - NSW LRS title search
- `sales.py` - RP Data / Pricefinder integration
- `imagery.py` - Nearmap API integration

**Dependencies:** Third-party API clients, authentication

---

## Data Storage Strategy

### Cache Directory (`/data/cache/`)
**Purpose:** Store API responses to reduce external calls and improve performance.

**Retention:**
- Cadastre: 30 days
- Planning overlays: 7 days
- DEM tiles: 90 days

**Format:** GeoJSON, JSON, GeoTIFF

---

### Static Data (`/data/static/`)
**Purpose:** Reference datasets that change infrequently.

**Contents:**
- LGA boundaries (GeoJSON)
- DCP precinct definitions
- Heritage listings
- Environmental zones

**Update Frequency:** Monthly or as legislated

---

### Exports (`/data/exports/`)
**Purpose:** Generated reports and output files.

**Contents:**
- PDF reports
- HTML reports
- GeoJSON exports
- Analysis results (JSON)

**Retention:** User-managed

---

## Configuration Files

### `/config/datasources.json`
```json
{
  "nsw_cadastre": {
    "endpoint": "https://portal.spatial.nsw.gov.au/...",
    "layers": ["DCDB", "..."],
    "cache_ttl": 2592000
  },
  "planning_portal": {
    "endpoint": "https://mapprod3.environment.nsw.gov.au/...",
    "layers": ["SEPP_Housing", "..."]
  }
}
```

### `/config/planning_rules.json`
Rule definitions for compliance engine.

### `/config/compliance_matrix.json`
Decision matrix for determining planning pathways.

---

## Testing Structure

### Unit Tests
- Test individual functions in isolation
- Mock external API calls
- Fast execution (< 1 second per test)

### Integration Tests
- Test service interactions
- Use cached sample data
- Validate data transformations

### End-to-End Tests
- Test complete analysis pipeline
- Known test addresses with expected results
- Performance benchmarking

---

## Development Workflow

1. **New Data Source**
   - Add client in appropriate service folder
   - Create data model in `/models/`
   - Add tests in `/tests/`
   - Update config files

2. **New Computation**
   - Add function to appropriate service
   - Write unit tests
   - Update API endpoint if needed
   - Document in architecture docs

3. **New Compliance Rule**
   - Add rule definition to JSON config
   - Implement check in compliance service
   - Add test cases
   - Document in planning docs

---

## Git Ignore Recommendations

```gitignore
# Data directories (except examples)
/data/cache/*
/data/exports/*
!/data/static/.gitkeep

# Environment files
.env
.env.local

# Backend
__pycache__/
*.pyc
.pytest_cache/
.coverage

# Frontend (existing)
.next/
node_modules/

# IDE
.vscode/
.idea/
*.swp
```

---

## Deployment Considerations

### Docker Compose Structure
```yaml
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL
      - NSW_API_KEY
    volumes:
      - ./data/cache:/app/cache

  frontend:
    build: .
    environment:
      - NEXT_PUBLIC_API_URL
      - NEXT_PUBLIC_GOOGLE_MAPS_KEY

  postgres:
    image: postgis/postgis:15-3.3
    volumes:
      - pgdata:/var/lib/postgresql/data
```

### Environment Variables
- `NSW_CADASTRE_ENDPOINT` - DCDB endpoint
- `NSW_PLANNING_ENDPOINT` - Planning Portal endpoint
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `DATABASE_URL` - PostgreSQL connection string
- `CACHE_DIR` - Cache directory path
- `LOG_LEVEL` - Logging verbosity

---

## Summary

This folder structure provides:
- **Modularity** - Independent service development
- **Testability** - Clear test organization
- **Scalability** - Easy to add new data sources
- **Maintainability** - Logical separation of concerns
- **Documentation** - Self-documenting structure

The structure aligns with the 7-section data architecture and supports both free NSW data sources and optional paid services.

---

*This folder structure guide is part of the Data Architecture documentation.*
