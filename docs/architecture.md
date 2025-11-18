# System Architecture – NSW Property Intelligence Engine (DevGPT)

This document describes the **overall architecture** of the NSW Property Intelligence Engine used by Johinke Developments.

The system is designed to:

- Take an address / Lot & DP / coordinates  
- Pull NSW spatial datasets (cadastre, overlays, DEM, planning)  
- Run a deterministic spatial + planning pipeline  
- Return a `ParcelAnalysisResult` JSON object  
- Be callable by DevGPT / GitHub / MCP / CLI / HTTP API  

---

## 1. High-Level Components

```text
+-------------------------------------------------------------+
|                      DevGPT / Agents                        |
|  (GitHub Agent, ChatGPT, CLI, HTTP clients, etc.)          |
+---------------------------+---------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|                NSW Property Intelligence Engine             |
|                                                             |
|  +-----------------+    +--------------------------------+  |
|  |   API Layer     |    |           Pipeline             |  |
|  |  (FastAPI)      |    |   analyse_parcel(input)       |  |
|  +-----------------+    +--------------------------------+  |
|           |                              |                 |
|           v                              v                 |
|    +-------------+        +------------------------------+ |
|    |   Models    |        |   Analysis / Planning Logic  | |
|    | (Pydantic / |        |  geometry / constraints /    | |
|    |  dataclasses)|       |  planning / feasibility      | |
|    +-------------+        +------------------------------+ |
|                     |         |           |                |
|                     v         v           v                |
|          +----------------+  +-----------------+           |
|          | Data Sources   |  |  PostGIS / Caches|          |
|          | (NSW APIs)     |  |  (optional)      |          |
|          +----------------+  +-----------------+           |
+-------------------------------------------------------------+
```

---

## 2. Codebase Structure (Recap)

From the repo root:

```
backend/app/
├─ config/          # Settings, CRS, dataset mappings
├─ data_sources/    # NSW APIs: cadastre, planning, DEM, roads, admin
├─ geometry/        # Polygon ops, boundaries, slope, centroids
├─ analysis/        # Spatial context, constraints, envelope, yield, risk
├─ planning/        # LEP/SEPP/CDC/LMR rules
├─ models/          # ParcelAnalysisResult, enums, types
├─ pipeline/        # Orchestration: analyse_parcel()
└─ api/             # FastAPI app, HTTP schemas
```

Agents (DevGPT, GitHub, MCP) live in:

```
backend/app/agents/
```

---

## 3. Data Flow Overview

### 3.1 Logical Flow

```
Input (address / Lot & DP / coordinates)
        |
        v
  Input Normalisation
        |
        v
      Cadastre
        |
        v
     Geometry
        |
        v
  Spatial Context
        |
        v
  Constraints & Overlays
        |
        v
  Planning Controls
        |
        v
 Development Metrics
        |
        v
   Feasibility & Risk
        |
        v
 ParcelAnalysisResult JSON
```

### 3.2 Orchestration

Core entrypoint:

```python
from backend.app.pipeline.runner import analyse_parcel

result: ParcelAnalysisResult = analyse_parcel(input)
```

This function calls the submodules in sequence:

1. `normalise_input`
2. `resolve_parcel` (cadastre)
3. `compute_geometry`
4. `build_spatial_context`
5. `evaluate_constraints`
6. `evaluate_planning_controls`
7. `compute_development_metrics`
8. `evaluate_feasibility`
9. `assemble_and_validate_result`

---

## 4. Data Source Integration

### 4.1 External Services

All remote data is consumed via:

- HTTPS (WMS/WFS/REST APIs)
- Configured in `config/settings.py` and `docs/datasets.md`

**Main external sources:**

- NSW Cadastre Web Service (parcel polygons)
- NSW Planning Portal (zoning, height, FSR, MLS)
- NSW Elevation (DEM/DSM/slope)
- SEED / LGA hazard overlays (flood, bushfire, ASS, etc.)
- Optional: LRS Info Brokers, RP Data, Nearmap (later)

### 4.2 Data Access Layer

Implemented in `data_sources/`:

- `cadastre.py`
- `planning_layers.py`
- `elevation.py`
- `roads.py`
- `admin_boundaries.py`

Each has a clear interface, for example:

```python
get_parcel_by_lot_plan(lot: str, plan: str) -> ParcelGeometry
get_height_control(geom) -> float
get_fsr_control(geom) -> float
get_dem_tile(geom) -> Raster
get_bushfire_overlays(geom) -> list[Overlay]
```

---

## 5. Storage & Caching

### 5.1 Stateless vs Stateful

The engine can run:

- **Stateless**: querying live NSW services for each request.
- **Stateful**: with a backing PostGIS database and local raster store.

**Recommended for performance:**

Local PostGIS for:
- Cached cadastre
- Cached planning overlays
- Pre-processed constraint layers

Local raster store (`data/processed/`) for:
- DEM tile cache
- Derived slope rasters

### 5.2 Caching Strategy

- First call → hit external API, cache in DB/raster store.
- Subsequent calls → use local cache if data version matches.

Dataset versions recorded in:

```json
"metadata": {
  "data_snapshots": [
    { "dataset_name": "NSW_DCDB", "version": "2025Q1", ... }
  ]
}
```

---

## 6. API Layer

### 6.1 FastAPI App

Located in `api/fastapi_app.py`.

**Example endpoint:**

```
POST /analyse_parcel
```

**Request:**

```json
{
  "input_type": "address",
  "value": "3 Nield Avenue, Balgowlah NSW 2093"
}
```

**Response:**

```json
{
  ... ParcelAnalysisResult ...
}
```

### 6.2 Pydantic Models

`api/schemas.py` defines:

- `ParcelInput`
- `ParcelAnalysisResponse` (wraps `ParcelAnalysisResult`)

These mirror `schemas/parcel_analysis.schema.json`.

---

## 7. Agent Integration (DevGPT / GitHub / MCP)

### 7.1 DevGPT / Custom GPT

DevGPT calls:

- `analyse_parcel()` directly (Python)
- or HTTP API `/analyse_parcel`

DevGPT then:

- Reads `ParcelAnalysisResult`
- Converts it into:
  - Human explanations
  - Risk commentary
  - Development strategy options
  - List of questions / gaps for DD

### 7.2 GitHub Agent

The GitHub agent:

- Lives in `agents/devgpt_agent.py`
- Can:
  - Call `analyse_parcel()`
  - Update READMEs / docs with examples
  - Help you inspect & tweak rules

---

## 8. Configuration & Environments

All environment-specific values are in:

- `config/settings.py`
- `.env` (not committed)

**Examples:**

- NSW API base URLs
- Dataset version tags
- LGA → layer mapping for flood / geotech
- CRS settings
- Feature flags (e.g. toggle LMR/TOD rules)

**Use environment separation:**

- **dev** – local, verbose logging, no aggressive caching
- **staging** – close to production, real data, debug off
- **prod** – throttled logging, strict schema validation

---

## 9. Validation & Testing

### 9.1 JSON Schema Validation

All final results are validated against:

```
schemas/parcel_analysis.schema.json
```

**Implementation:**

```python
validate_against_schema(result_json, "parcel_analysis.schema.json")
```

### 9.2 Test Suite

Tests in `tests/`:

- `test_geometry.py`
- `test_constraints.py`
- `test_planning_rules.py`
- `test_yield_engine.py`
- `test_risk_engine.py`
- `test_pipeline.py`
- `test_schema_compat.py`

---

## 10. Non-Functional Objectives

- **Deterministic** – same input + same dataset version → same output.
- **Transparent** – trace every decision back to:
  - A dataset
  - A rule
  - A function
- **Composable** – easy to plug into:
  - Agents
  - Dashboards
  - Batch ETL
- **Replaceable data sources** – can swap in:
  - Local mirrors of NSW data
  - Commercial feeds (CoreLogic, Nearmap)
  - LRS title APIs (per-site DD)

---

## 11. Future Extensions

- Multi-site batch analysis (`analyse_parcels_bulk`)
- Region-wide heatmaps (yield / risk)
- Temporal comparison (old vs new planning controls)
- Cost & finance modules (La Trobe-style TDC, LTC, LVR)
- Direct integration with feasibility spreadsheets / models
- Integration with CAD/BIM (export envelopes as DXF/IFC)
