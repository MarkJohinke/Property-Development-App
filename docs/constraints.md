# Constraints Engine – Hazard, Environmental & Statutory Overlays

This module defines how the NSW Property Intelligence Engine (DevGPT) evaluates **planning constraints** for each parcel.

Core code lives in:

- `analysis/constraints_engine.py`
- `planning_rules.md` (cross-referenced)
- `config/settings.py` (dataset mapping per LGA)

Constraints are essential for:
- CDC eligibility  
- DA risk analysis  
- Development yield restrictions  
- Required specialist reports  

---

## 1. Overview

For each parcel polygon, the engine will:

1. Pull **constraint layers** (WMS/WFS/FeatureServer).  
2. Transform to analysis CRS (e.g. `EPSG:7856`).  
3. Run spatial intersections:
   ```sql
   ST_Intersects(parcel_geom, constraint_layer.geom)
   ```
4. Summarise severity, class, and notes.
5. Populate the constraints section in `ParcelAnalysisResult`.

The engine supports:

- **binary flags** (e.g. `bushfire_prone`)
- **classes** (e.g. "Class 1" acid sulfate soils)
- **qualitative descriptors** (e.g. "High landslip risk")
- **free-text notes**

---

## 2. Constraint Categories

### 2.1 Bushfire-Prone Land (BFPL)

**Dataset**

- NSW RFS Bush Fire Prone Land mapping (version-specific, LGA-aligned).
- Attributes typically include Vegetation Category (1/2), Buffer Zones etc.

**Logic**

```python
constraints.bushfire_prone = intersects(parcel, BFPL_layer)
if bushfire_prone:
    constraints.bushfire_category = BFPL_layer.category
```

**CDC/DA Impacts**

- **CDC**:
  - Bushfire → BAL assessment required.
  - CDC may be prohibited if BAL > 40 or insufficient frontage for access/defendable space.
- **DA**:
  - Requires a Bushfire Assessment Report.

**Risk Weighting**

- Category 1 vegetation → High
- Category 2 → Medium
- Buffer only → Low

### 2.2 Flood-Prone Land

**Dataset**

- SEED / LGA-specific flood planning layers.
- Sometimes multiple datasets:
  - Flood Planning Level (FPL)
  - Floodplain Risk Management Study
  - Overland Flow Mapping
  - Depth / Hazard zones

**Logic**

```python
constraints.flood_prone = intersects(parcel, flood_layers)
constraints.flood_notes = extract_severity_or_zone(flood_layers)
```

**CDC/DA Impacts**

- **CDC**:
  - Flood control lot → CDC not permitted under Low-Rise Housing unless certain criteria met.
- **DA**:
  - Flood Study often required.
  - Council may impose minimum floor levels, OSD modelling, stormwater constraints.

**Risk Weighting**

- High hazard / deep flood → High
- Overland flow only → Medium/Low

### 2.3 Acid Sulfate Soils (ASS)

**Dataset**

- NSW ESS datasets or LGA-specific ASS mapping.
- Classes: 1, 2, 3, 4, 5.

**Logic**

```python
if intersects(parcel, ASS_layer):
    constraints.acid_sulfate_soil_class = ASS_layer.class
else:
    constraints.acid_sulfate_soil_class = "None"
```

**Impacts**

- Class 1–2 → High (requires detailed ASS management plan).
- Class 3–4 → Medium.
- Class 5 → Low.

**Planning Pathways**

- ASS may require development conditions or excavation management plans.

### 2.4 Heritage

**Dataset**

- LEP Heritage Item layer
- LEP Heritage Conservation Area layer (HCA)

**Logic**

```python
constraints.heritage_item = intersects(parcel, heritage_items)
constraints.heritage_conservation_area = intersects(parcel, heritage_areas)
```

**Impacts**

- **Item**:
  - DA only; complex assessment; design controls very strict.
  - Demolition may be prohibited.
- **HCA**:
  - Streetscape/character requirements.
  - CDC not permitted in many cases.

**Risk Weighting**

- Item → Very High
- HCA → High
- Nearby only → Medium

### 2.5 Foreshore Building Line (FBL)

**Dataset**

- Coastal/foreshore building line layer.

**Logic**

```python
constraints.foreshore_building_line = intersects(parcel, FBL_layer)
```

**Impacts**

- Strict building envelope controls.
- Height & setback may be significantly restricted.
- DA typically required (CDC unlikely).

### 2.6 Riparian / Waterway Buffers

**Dataset**

- Hydrography / riparian buffer polygons.

**Logic**

```python
constraints.riparian_buffer = intersects(parcel, riparian_layer)
```

**Impacts**

- Building may be restricted within 20m–40m buffers.
- Significant landscaping / ecological reports required.

### 2.7 Biodiversity / Vegetation Constraints

**Dataset**

- Vegetation mapping, threatened species, biodiversity sensitivity mapping.

**Logic**

```python
constraints.biodiversity = intersects(parcel, biodiversity_layer)
```

**Impacts**

- Flora & fauna reports
- Habitat assessments
- Possible biodiversity offsets

### 2.8 Geotechnical / Landslip Risk

**Dataset**

- LGA geotech layers (varies widely)
- Categories: Low / Moderate / High / Very High

**Logic**

```python
constraints.geotech_landslip_risk = get_risk(parcel, geotech_layer)
```

**Impacts**

- High/Very High require:
  - Geotechnical report
  - Restrictive structural requirements

### 2.9 Miscellaneous Overlays

Catch-all for additional LGA or NSW overlays:

- Airport noise contours
- Scenic Protection Areas
- Coastal Erosion Lines
- Bushfire Evacuation Zones
- Foreshore Scenic Protection

**Logic:**

```python
constraints.other_overlays.append({
    "name": overlay_name,
    "type": overlay_type,
    "severity": computed_severity,
    "notes": additional_info
})
```

---

## 3. Constraint Severity & Risk Scoring

The constraints engine rolls up individual hazards into an **overall constraint severity score**, which feeds into:

- `feasibility.overall_risk_rating`
- `cdc_potential.blocking_constraints`
- `da_potential.key_issues`

### Severity Scores (0–3)

| Severity | Meaning |
|----------|---------|
| 0 | No constraint |
| 1 | Minor / low-risk |
| 2 | Medium / requires study |
| 3 | High-risk / CDC blocker |

### Weighted Model

Each constraint contributes a weighted score:

```
score =
    bushfire_weight * severity(bushfire) +
    flood_weight * severity(flood) +
    heritage_weight * severity(heritage) +
    geotech_weight * severity(geotech) +
    biodiversity_weight * severity(biodiv) +
    misc_weight * severity(other)
```

**Defaults (configurable):**

```python
bushfire_weight = 3
flood_weight = 3
heritage_weight = 4
geotech_weight = 2
biodiversity_weight = 1
misc_weight = 1
```

### Overall Rating

| Total Score | Rating |
|-------------|--------|
| 0–3 | Low |
| 4–7 | Medium |
| 8–12 | High |
| >12 | Red-Flag |

---

## 4. Required Studies / Reports

Based on constraints, the engine recommends required studies:

**Bushfire**
- BAL Certificate
- Bushfire Assessment Report

**Flood**
- Flood Study
- Flood Impact Assessment

**Geotech**
- Geotechnical Report
- Slope stability assessment

**Trees / Vegetation**
- Arborist Report
- Biodiversity Assessment

**Coastal / Foreshore**
- Coastal Hazard Assessment
- Foreshore Setback Report

Automatically populated in:

```json
"feasibility": {
  "da_potential": {
    "recommended_studies": [...]
  }
}
```

---

## 5. CDC-Specific Constraint Rules

The following constraints **block CDC** under the Low-Rise Housing Code or other SEPP pathways:

| Constraint | CDC Impact |
|------------|------------|
| Bushfire at BAL-FZ or BAL > 40 | CDC prohibited |
| Flood control lot (unresolved FPL) | CDC prohibited |
| Heritage Item | CDC prohibited |
| Heritage Conservation Area | CDC prohibited |
| Foreshore Building Line | CDC prohibited |
| Riparian Buffer | CDC restricted / prohibited |
| Non-compliant lot size or frontage | CDC prohibited |

These rules live in:

- `planning/cdc_low_rise.py`

---

## 6. DA-Specific Constraint Rules

DA is more flexible but constraints still drive:

- Required reports
- Likelihood of support
- Design modifications

**Example DA logic:**

- Flood + geotech → "Medium risk" DA
- Heritage item → "High risk" DA
- Bushfire (Category 1) + slope > 15% → "DA possible but with significant conditioning"

---

## 7. Constraint Output Structure

Example output:

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

---

## 8. Testing Standards

Create tests in:

- `tests/test_constraints.py`
- `tests/test_planning_rules.py`

**Test matrix should include parcels:**

- inside BFPL
- inside FPL
- inside HCA
- with ASS Class 1
- inside riparian buffer
- high geotech risk
- and combinations

**Edge cases:**

- Overlays touching parcel boundary
- Multi-part overlays
- Conflicting overlays

---

This constraints framework is built to be deterministic, transparent, and easy to extend as NSW datasets change.
It is designed so the DevGPT agent can give crystal-clear, developer-level explanations instantly.
