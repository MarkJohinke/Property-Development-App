# NSW Datasets & Web Services

This document lists the **authoritative datasets** used by the NSW Property Intelligence Engine (DevGPT), with a focus on **free, government-hosted sources**.

The engine assumes all spatial services are consumed via **WMS / WFS / REST** and cached/processed into PostGIS.

> **Note:** Replace `<BASE_URL>` placeholders with your actual service URLs when wiring up.

---

## 1. Cadastre & Property Base Layers

### 1.1 NSW Cadastre Web Service (DCDB)

- **Owner:** Spatial Services (DCS NSW)
- **Description:** Dynamic map of cadastral features extracted from the **NSW Digital Cadastral Database (DCDB)** – the official parcel fabric for NSW.
- **Coverage:** State-wide, current titles only.
- **Key contents:**
  - Cadastral parcel polygons (lots, roads, reserves, easements etc.)
  - Lot & Plan (e.g. `LOT 2 DP228402`)
  - Basic admin fields (LGA, locality, parcel name)
- **Formats / access:**
  - ArcGIS MapServer / FeatureServer (web service)
  - Web service profile (PDF) documents endpoint usage, layer names, and attributes.

**Usage in engine**

- Primary source of:
  - `parcel.polygon`
  - `parcel.lot_number`, `parcel.plan_number`, `parcel.plan_type`
  - `parcel.area_sqm` (validated vs recomputed area)
- Downstream used by:
  - `geometry.*` (frontage, depth, perimeter)
  - `spatial_context.*`
  - `constraints.*` (for intersection with hazard layers)

---

### 1.2 NSW Property Web Service (Optional)

- **Owner:** Spatial Services
- **Description:** Complementary service exposing basic property attributes linked to parcels (e.g. property identifiers, address strings).
- **Usage:** As a backup/secondary source to resolve:
  - Canonical address
  - Property identifiers separate from cadastre features

---

## 2. Elevation & Terrain

The engine uses **bare earth DEM** and derivative products to compute slopes, aspects and fall directions.

### 2.1 NSW Elevation Data Service

- **Owner:** Spatial Services (DCS NSW)
- **Description:** On-demand delivery service for NSW elevation products, including a **5 m DEM, slope and aspect datasets** for large parts of NSW.
- **Coverage:** NSW, with particular detail over Western NSW (DEM, slope, aspect at 5 m resolution).
- **Formats / access:**
  - Web application for tile download (Data.NSW)
  - DEM/slope/aspect grids in ASCII GRID and other raster formats

**Usage in engine**

- DEM / slope used for:
  - `development_metrics.slope.mean_gradient_percent`
  - `development_metrics.slope.max_gradient_percent`
  - `development_metrics.slope.primary_fall_direction_deg`
  - `development_metrics.slope.falls_to_street`

---

### 2.2 DEM-S (Modified Digital Elevation Model – Surface)

- **Owner:** Spatial Services
- **Description:** DEM-S "Landscape – Modified (DEM-S) Elevation layer"; negative values removed and snapped to common extent for analysis.
- **Usage:** Optional alternative elevation source for more consistent state-wide analysis.

---

### 2.3 ELVIS – Elevation and Depth (National)

- **Owner:** Geoscience Australia / ICSM
- **Description:** National hub for elevation and bathymetry data across Australia, aggregating Commonwealth and state datasets.
- **Usage:** Fallback source when NSW-specific DEM coverage is missing or insufficient.

---

## 3. Bushfire & Natural Hazard Datasets

### 3.1 NSW Bush Fire Prone Land

- **Owner:** NSW Rural Fire Service
- **Description:** Certified map of **Bush Fire Prone Land (BFPL)** prepared under the BFPL Mapping Guide and certified by the Commissioner under the EP&A Act.
- **Coverage:** State-wide, with versions aligned to mapping guide releases.
- **Formats / access:**
  - Dataset on SEED and Data.NSW with web map services.

**Usage in engine**

- Populates:
  - `constraints.bushfire_prone`
  - `constraints.bushfire_category` (where category fields are available)
- Feeds planning logic for:
  - CDC / DA pathways (bushfire triggers)
  - Requirement for bushfire reports / BAL assessments

---

### 3.2 Flood Planning Layers

Flood data is **LGA-specific**, usually aggregated via SEED or council GIS.

- **Sources:**
  - SEED and data portals for flood planning layers per LGA
  - LGA flood study layers (where available)
- **Usage:**
  - `constraints.flood_prone`
  - `constraints.flood_notes`
  - Trigger for "flood study required" in `feasibility.da_potential.recommended_studies`

> Implementation note: configure an **LGA → flood layer mapping** in `config/settings.py`.

---

### 3.3 Other Hazard / Environment Layers (Configured per LGA/NSW)

Examples (all typically available via SEED / Planning / LGA portals):

- Acid sulfate soils
- Geotechnical / landslip hazard
- Coastal hazard / erosion lines
- Riparian buffers / watercourses
- Biodiversity / vegetation constraints

These feed:

- `constraints.acid_sulfate_soil_class`
- `constraints.geotech_landslip_risk`
- `constraints.riparian_buffer`
- `constraints.biodiversity`
- `constraints.other_overlays[]`

---

## 4. Planning Controls (LEP/SEPP Spatial Data)

The **NSW Planning Portal Open Data** exposes standardised spatial datasets for local planning instruments.

### 4.1 Height of Buildings

- **Owner:** Department of Planning, Housing and Infrastructure
- **Dataset:** *Environmental Planning Instrument – Height of Buildings*
- **Description:** Identifies maximum building height permitted on land under the relevant EPI.
- **Access formats:** PDF, WMS, WFS, ArcGIS REST, JSON, etc.

**Usage in engine**

- Feeds:
  - `development_metrics.envelope.max_height_m`
  - Planning rules for height controls in `planning/lep_rules.py`

---

### 4.2 Floor Space Ratio (FSR)

- **Dataset:** *Environmental Planning Instrument – Floor Space Ratio*
- **Description:** Spatial dataset mapping maximum FSR for land under relevant EPIs.
- **Usage in engine:**
  - `development_metrics.envelope.fsr_control`
  - `development_metrics.envelope.max_gfa_sqm`
  - `feasibility.yield.indicative_dwellings_count`

---

### 4.3 Minimum Lot Size (LSZ)

- **Dataset:** *Environmental Planning Instrument – Minimum Lot Size*
- **Description:** Spatial dataset mapping minimum lot sizes defined under EPIs.
- **Usage in engine:**
  - Subdivision feasibility checks
  - Dual occ / terrace feasibility constraints

---

### 4.4 Zoning (Land Use Zone)

- **Dataset:** LEP land zoning layers (e.g. R1, R2, R3 etc.) from the Planning Portal open data.
- **Usage in engine:**
  - `administrative.zone.code` / `.name`
  - Inputs to:
    - LMR / SEPP Housing Chapter 6 logic
    - CDC low-rise housing eligibility
    - Typology feasibility (dual occ, terraces, manor houses, apartments)

---

## 5. Administrative Boundaries & Roads

### 5.1 LGA & Locality Boundaries

- **Owner:** Spatial Services / Planning
- **Description:** Polygon layers for:
  - Local Government Area (LGA)
  - Suburb/locality
- **Usage in engine:**
  - `administrative.lga_name`, `.lga_code`, `.locality`
  - LGA-specific rule branching in planning and constraints engines

---

### 5.2 Wards & Precincts

- **Source:** Council or Planning data (where available)
- **Usage:**
  - `administrative.ward`
  - DCP-specific rule branching in `planning_rules.md`/`planning/` code.

---

### 5.3 Road Centreline / Transport Layers

- **Owner:** Typically Transport for NSW / Spatial Services
- **Usage in engine:**
  - `spatial_context.nearest_road.*`
  - `spatial_context.road_reserve_width_m`
  - Frontage/road hierarchy classification
  - Walkable distance buffers to centres and public transport

---

## 6. Centres, TOD & Activity Areas

TOD / LMR logic requires **centre points or polygons**:

- **Sources:**
  - NSW Planning centre and corridor datasets (where published)
  - LGA centres defined in DCP or strategies (manually curated)
- **Usage in engine:**
  - `spatial_context.centre_access.nearest_centre_name`
  - `spatial_context.centre_access.distance_m`
  - `spatial_context.centre_access.inner_ring_400m`
  - `spatial_context.centre_access.outer_ring_800m`

Implementation detail:

- Store curated centre geometries in `data/processed/centres.gpkg`
- Maintain configuration for which LGAs/town centres qualify for LMR/TOD rules.

---

## 7. Title & Ownership Data (Optional, Paid)

**Not part of the free NSW stack**, but used at DD stage.

- **Source:** NSW Land Registry Services (LRS) via authorised brokers (e.g. Landchecker, CITEC Confirm, Information Brokers, Fynd).
- **Products:**
  - Title search (ownership, dealings, easements)
  - Plan images / documents
- **Usage in engine (optional):**
  - Extend:
    - `parcel.*` with title reference details
    - `constraints.other_overlays[]` for easements, covenants
  - Support DD workflows, not core automated feasibility.

> NOTE: These products are **fee-based** (typical retail range ~$20–45 per title search) and must be consumed under each broker's licence terms.

---

## 8. Implementation Notes

1. **CRS Standardisation**
   - Normalise all source layers to a standard CRS (e.g. `EPSG:7856` GDA2020 / MGA Zone 56 or 55 depending on region).

2. **Caching / Versioning**
   - Maintain dataset version tags in `metadata.data_snapshots[]` in each `ParcelAnalysisResult`.

3. **Per-LGA Overrides**
   - Flood, geotech, and some constraints differ by LGA; configure per-LGA dataset mappings in `config/settings.py`.

4. **Licensing**
   - NSW government open datasets usually follow open or CC-style licences; check each dataset's licence field on Data.NSW / SEED / Planning Portal.

---

## 9. Quick Reference Table

| Data Type | Source | Cost | Schema Field(s) | Update Frequency |
|-----------|--------|------|-----------------|------------------|
| Cadastre (DCDB) | Spatial Services | Free | `parcel.*`, `geometry.polygon` | Real-time |
| DEM/Slope | Spatial Services | Free | `development_metrics.slope.*` | Annual |
| Bushfire Prone Land | NSW RFS | Free | `constraints.bushfire_*` | As certified |
| Flood Planning | LGA/SEED | Free | `constraints.flood_*` | Per LGA study |
| Height Controls | Planning Portal | Free | `development_metrics.envelope.max_height_m` | As gazetted |
| FSR | Planning Portal | Free | `development_metrics.envelope.fsr_control` | As gazetted |
| Zoning | Planning Portal | Free | `administrative.zone.*` | As gazetted |
| LGA Boundaries | Spatial Services | Free | `administrative.lga_*` | Annual |
| Road Network | Transport NSW | Free | `spatial_context.nearest_road.*` | Quarterly |
| Title Search | LRS Brokers | $20-45 | Optional extension | On-demand |

---

## 10. Related Documentation

This file should be kept in sync with:

- [geometry.md](./geometry.md) - How geometry calculations use cadastre data
- [constraints.md](./constraints.md) - Constraint overlay logic
- [planning_rules.md](./planning_rules.md) - Planning instrument application
- [parcel_analysis.schema.json](../schemas/parcel_analysis.schema.json) - Output schema

---

*Last updated: November 2025*
