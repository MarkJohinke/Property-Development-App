# Processing Pipeline – NSW Property Intelligence Engine

This document describes the **end-to-end pipeline** used by the NSW Property Intelligence Engine (DevGPT) to convert an input (address / Lot/DP / coordinates) into a structured `ParcelAnalysisResult` JSON object.

The main orchestration entrypoint is:

```python
analyse_parcel(input: ParcelInput) -> ParcelAnalysisResult
```

---

## 1. High-Level Flow

```
           +------------------+
           |  User / Agent    |
           |  (Address, Lot)  |
           +---------+--------+
                     |
                     v
           +------------------+
           |  1. Input        |
           |  Normalisation   |
           +---------+--------+
                     |
                     v
           +------------------+
           |  2. Parcel       |
           |  Resolution      |
           |  (Cadastre)      |
           +---------+--------+
                     |
                     v
           +------------------+
           |  3. Geometry     |
           |  Engine          |
           +---------+--------+
                     |
                     v
           +------------------+
           |  4. Spatial      |
           |  Context         |
           +---------+--------+
                     |
                     v
           +------------------+
           |  5. Overlays &   |
           |  Constraints     |
           +---------+--------+
                     |
                     v
           +------------------+
           |  6. Planning     |
           |  Controls        |
           +---------+--------+
                     |
                     v
           +------------------+
           |  7. Dev Metrics  |
           |  (Slope, Yield)  |
           +---------+--------+
                     |
                     v
           +------------------+
           |  8. Feasibility  |
           |  & Risk Engine   |
           +---------+--------+
                     |
                     v
           +------------------+
           |  9. Assembly &   |
           |  Validation      |
           +------------------+
```

---

## 2. Step 1 – Input Normalisation

**Module:** `src/nsw_property_intel/pipeline/steps.py` (`normalise_input`)

### Responsibilities

Accept various input forms:

- Free-text address
- Explicit `Lot 2 DP228402`
- Coordinates (lat/lon)

Clean, normalise, and classify the query:

```json
"input": {
  "query_type": "address" | "lot_plan" | "coordinates",
  "raw_input": "3 Nield Avenue, Balgowlah NSW 2093",
  "resolved_address": "...",
  "resolved_lot_plan": "...",
  "resolved_coordinates": { "lat": ..., "lon": ... }
}
```

### Typical operations

- Address parsing & geocoding (e.g. NSW address services / your own geocoder)
- Lot/DP string parsing (`"Lot 2 DP228402"` → `{ lot: "2", plan: "DP228402" }`)
- Basic validation and error handling (no parcel found, ambiguous, etc.)

---

## 3. Step 2 – Parcel Resolution (Cadastre)

**Module:** `data_sources/cadastre.py` (`get_parcel_by_lot_plan`, `get_parcel_by_point`)

### Responsibilities

Resolve a single cadastral parcel from NSW Cadastre based on:

- Lot/Plan, or
- A point (geocoded address)

### Outputs

Populate `parcel` and initial `geometry` fields:

```json
"parcel": {
  "lot_number": "2",
  "plan_number": "228402",
  "plan_type": "DP",
  "rpd": "Lot 2 DP228402",
  "parcel_type": "Lot",
  "area_sqm": 607.0,
  "source_dataset": "NSW_DCDB_2025Q1",
  "spatial_accuracy_code": "SC2"
},
"geometry": {
  "coordinate_reference_system": "EPSG:7856",
  "polygon": { "type": "Polygon", "coordinates": [...] },
  "centroid": { "lat": -33.789..., "lon": 151.26... }
}
```

### Implementation details

- Query cadastre web service (WFS/REST):
  - By `LOT + PLAN` attributes, or
  - By spatial point query (contains)
- Reproject into standard analysis CRS
- Cache results in local DB/PostGIS where appropriate

---

## 4. Step 3 – Geometry Engine

**Module:** `geometry/polygon_ops.py`, `geometry/boundaries.py`, `geometry/centroid.py`, `geometry/slope.py`

### Responsibilities

Compute survey-like geometric properties from the parcel polygon:

#### Boundary segmentation

- Identify external ring of the polygon
- Determine:
  - **Front boundary** (adjacent to primary road)
  - **Rear boundary** (opposite front)
  - **Side boundaries**
- Calculate segment lengths & bearings

#### Derived dimensions

Populate:

```json
"geometry": {
  "boundaries": {
    "front": { "length_m": 15.2, "orientation_deg": 90.0, "num_segments": 1 },
    "rear":  { "length_m": 15.2, "orientation_deg": 270.0, "num_segments": 1 },
    "sides": [
      { "name": "left",  "length_m": 40.0, "orientation_deg": 0.0 },
      { "name": "right", "length_m": 40.0, "orientation_deg": 0.0 }
    ],
    "perimeter_m": 110.4
  },
  "frontage_m": 15.2,
  "depth_m": 40.0,
  "regularity_index": 0.95,
  "is_corner_lot": false
}
```

### Algorithms (high level)

- **Front boundary detection:** intersection with road centreline / road polygon
- **Regularity index:** compare area/perimeter ratios to equivalent rectangle
- **Corner lot:** more than one boundary adjacent to roads

---

## 5. Step 4 – Spatial Context

**Module:** `analysis/spatial_context.py`

### Responsibilities

Understand the parcel's position relative to neighbouring parcels, roads, and centres.

### Key outputs

```json
"spatial_context": {
  "adjacent_parcels": [
    { "lot_plan": "Lot 1 DP228402", "relationship": "side" },
    { "lot_plan": "Lot 3 DP228402", "relationship": "side" }
  ],
  "nearest_road": {
    "name": "Nield Avenue",
    "road_class": "local",
    "distance_m": 0.0,
    "is_primary_frontage": true
  },
  "road_reserve_width_m": 12.0,
  "centre_access": {
    "nearest_centre_name": "Balgowlah Local Centre",
    "distance_m": 520.0,
    "inner_ring_400m": false,
    "outer_ring_800m": true
  }
}
```

### Operations

- Spatial join with road centreline and road reserves
- Calculate road distance, classification, reserve width
- Spatial join with centres / TOD geometries
- Compute 400 m / 800 m walking buffers

---

## 6. Step 5 – Overlays & Constraints

**Module:** `analysis/constraints_engine.py`

### Responsibilities

Intersect the parcel with all configured hazard and constraint layers:

- Bushfire prone land
- Flood planning area
- Acid sulfate soil mapping
- Foreshore building line
- Heritage item / conservation area
- Riparian buffers / watercourses
- Biodiversity / vegetation constraints
- Geotechnical / landslip risk
- Any LGA-specific constraint overlays

### Key outputs

```json
"constraints": {
  "bushfire_prone": true,
  "bushfire_category": "Vegetation Category 1",
  "flood_prone": false,
  "acid_sulfate_soil_class": "Class 3",
  "heritage_item": false,
  "heritage_conservation_area": false,
  "foreshore_building_line": false,
  "riparian_buffer": false,
  "biodiversity": false,
  "geotech_landslip_risk": "Low",
  "other_overlays": []
}
```

### Implementation

- Use PostGIS `ST_Intersects` or equivalent for each overlay
- LGA-specific mapping of which layers apply
- Capture severity / class + human-readable notes where available

---

## 7. Step 6 – Planning Controls

**Module:** `planning/lep_rules.py`, `planning/sepp_housing_ch6.py`, `planning/cdc_low_rise.py`

### Responsibilities

Determine statutory planning controls relevant to the parcel:

- Zoning (R1, R2, R3, etc)
- Height of buildings (HOB)
- Floor Space Ratio (FSR)
- Lot size controls
- Any overlay-specific development controls

### Populate:

```json
"administrative": {
  "lga_name": "Northern Beaches Council",
  "locality": "Balgowlah",
  "zone": {
    "code": "R1",
    "name": "General Residential",
    "instrument": "Northern Beaches LEP"
  },
  "planning_instruments": [
    { "code": "NBLEP", "name": "Northern Beaches LEP", "version": "2025.01" },
    { "code": "SEPP_HOUSING_CH6", "name": "Housing SEPP Chapter 6", "version": "2025.01" }
  ]
},
"development_metrics": {
  "envelope": {
    "max_height_m": 8.5,
    "fsr_control": 0.6,
    "max_gfa_sqm": 364.2,
    "front_setback_m": 6.0,
    "rear_setback_m": 6.0,
    "side_setback_min_m": 0.9,
    "deep_soil_required_sqm": 90.0,
    "landscaped_area_required_sqm": 180.0
  }
}
```

### Operations

- Spatial join with EPI height, FSR, lot size, zoning layers
- Apply LGA-specific or SEPP-specific rules to derive envelope numbers
- Prepare rule context for yield and feasibility engines

---

## 8. Step 7 – Development Metrics (Slope, Envelope, Yield)

**Module:**

- `geometry/slope.py` (slope & aspect)
- `analysis/envelope_engine.py` (building envelope)
- `analysis/yield_engine.py` (development options)

### Responsibilities

Convert geometry + planning controls + constraints into development-ready metrics.

### 8.1 Slope

Using DEM/DSM:

```json
"development_metrics": {
  "slope": {
    "mean_gradient_percent": 7.5,
    "max_gradient_percent": 14.0,
    "primary_fall_direction_deg": 180.0,
    "falls_to_street": true
  }
}
```

### 8.2 Envelope

Construct a simplified code-compliant envelope:

- Height plane
- Front / rear / side setbacks
- Deep soil & landscape allocation
- Private open space assumptions

Already shown in Step 6 output example.

### 8.3 Yield

Evaluate typologies:

```json
"development_metrics": {
  "yield": {
    "dual_occ_feasible": true,
    "terrace_row_feasible": false,
    "manor_house_feasible": false,
    "multi_dwelling_feasible": false,
    "indicative_dwellings_count": 2,
    "notes": "Likely 2 x 2–3 storey duplex dwellings under R1 controls."
  }
}
```

**Core inputs:**

- Parcel area
- Envelope maximum GFA
- Minimum lot sizes / frontage
- Controls under LMR / SEPP / LEP
- Constraints (flood, bushfire etc) that remove typologies

---

## 9. Step 8 – Feasibility & Risk Engine

**Module:** `analysis/risk_engine.py`, `planning/cdc_low_rise.py`, `planning/da_guidance.py`

### Responsibilities

Summarise feasibility pathways and risk in a way a developer / agent can act on.

### 9.1 CDC Potential

```json
"feasibility": {
  "cdc_potential": {
    "is_potentially_cdc_compliant": true,
    "likely_pathway": "CDC - Dual Occupancy",
    "blocking_constraints": [
      "Bushfire mapping – BAL assessment required",
      "Flood level unknown – check pre-development flood mapping"
    ]
  }
}
```

### 9.2 DA Potential

```json
"feasibility": {
  "da_potential": {
    "is_likely_supportable": true,
    "key_issues": [
      "Streetscape / bulk & scale in existing single dwelling context"
    ],
    "recommended_studies": [
      "Flood Study (if council flood layer intersects)",
      "Bushfire Report",
      "Arborist Report (if significant trees present)"
    ]
  },
  "overall_risk_rating": "Medium",
  "notes": "Viable duplex site subject to bushfire/flood DD; CDC possible but may require design refinement."
}
```

**Risk rating is derived from:**

- Number & severity of constraints
- Alignment with CDC/DA rules
- Slope / access / geotech
- LGA historical strictness (if modelled)

---

## 10. Step 9 – Assembly & Validation

**Module:** `pipeline/runner.py`, `models/parcel_analysis.py`, `tests/test_schema_compat.py`

### Responsibilities

- Assemble all step outputs into a single `ParcelAnalysisResult` object.
- Validate against `schemas/parcel_analysis.schema.json`.
- Attach metadata:

```json
"metadata": {
  "generated_at_utc": "2025-11-18T00:00:00Z",
  "engine_version": "1.0.0",
  "data_snapshots": [
    { "dataset_name": "NSW_DCDB", "version": "2025Q1", "retrieved_at_utc": "2025-02-01T12:00:00Z" },
    { "dataset_name": "NSW_EPI_Height", "version": "2025.01", "retrieved_at_utc": "2025-02-10T09:00:00Z" }
  ],
  "source_system": "DevGPT-v1"
}
```

Return the final JSON to:

- API callers (FastAPI endpoint)
- GitHub / MCP / DevGPT agents
- CLI tools or batch processes

---

## 11. Error Handling & Fallbacks

Key failure modes & typical responses:

- **No parcel found** → return structured error with `query_type`, `raw_input`, and a reason.
- **Multiple parcels matched** → mark as ambiguous, list candidates, let agent/user choose.
- **Missing LGA overlays** → mark affected constraint fields as `"Unknown"`, set risk to `Medium` with warning.
- **DEM/DSM gap** → degrade slope metrics gracefully (e.g. `"mean_gradient_percent": null` with notes).

All errors should:

- Never crash the pipeline.
- Be captured in `metadata.notes` for debugging.

---

## 12. Integration Points

- **FastAPI / HTTP API** → `api/fastapi_app.py` exposes `/analyse_parcel`.
- **Agents (DevGPT, GitHub, MCP)** → `agents/devgpt_agent.py` calls `analyse_parcel()` and then translates the JSON into human explanations, feasibility commentary, and actions.
- **Batch mode** → A CLI or script that iterates over many parcels and stores results in a database for bulk analysis.

---

## Summary

This pipeline is the backbone of the NSW Property Intelligence Engine.

All other modules (agents, UIs, reports) are thin layers on top of this process.

---

## Related Documentation

- [datasets.md](./datasets.md) - NSW data sources and endpoints
- [geometry.md](./geometry.md) - Detailed geometry computation algorithms
- [constraints.md](./constraints.md) - Constraint overlay logic
- [planning_rules.md](./planning_rules.md) - Planning rule implementation
- [feasibility.md](./feasibility.md) - Feasibility assessment logic
- [parcel_analysis.schema.json](../schemas/parcel_analysis.schema.json) - Complete output schema

---

*Last updated: November 2025*
