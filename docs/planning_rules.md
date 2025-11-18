# Planning Rules Engine – LEP, SEPP, CDC, LMR

This module defines the **statutory rules** the NSW Property Intelligence Engine (DevGPT) uses to determine development controls, typology feasibility, and planning pathways.

Relevant code lives in:

- `planning/lep_rules.py`
- `planning/sepp_housing_ch6.py`
- `planning/cdc_low_rise.py`
- `planning/da_guidance.py`

It consumes:

- Parcel geometry  
- Zoning (LEP)  
- Height of Buildings  
- Floor Space Ratio  
- Lot Size  
- CDC / SEPP triggers  
- Constraints (bushfire, flood, heritage, etc)  

---

## 1. Land Zoning (LEP)

Zoning defines allowed land uses & typologies.

### Primary Residential Zones

| Zone | Meaning | Typical Yield |
|------|---------|----------------|
| **R1** | General Residential | Duplex, Multi-dwelling, Terrace, Manor House |
| **R2** | Low Density Residential | Dual Occ, Torrens subdivision (rare), Single Dwelling |
| **R3** | Medium Density | Multi-unit / Manor / Terrace, sometimes apartments |
| **R4** | High Density | Apartments |
| **R5** | Large Lot | Large lot housing; dual occ sometimes allowed |

### Engine Logic

In `lep_rules.py`, once zoning is identified:

```python
if zone == "R2":
    allow_dual_occ = True
    allow_multi_dwelling = False
elif zone == "R1":
    allow_dual_occ = True
    allow_multi_dwelling = True
elif zone == "R3":
    allow_terrace = True
    allow_manor = True
    allow_multi_dwelling = True
```

Everything else flows downstream from these flags.

---

## 2. Height of Buildings (LEP)

Height controls are mapped spatially (metres above ground).

**Engine Logic**

```python
height_m = get_height_from_layer(parcel_geom)
development_metrics.envelope.max_height_m = height_m
```

Typical Sydney/Northern Beaches heights:

- 8.5 m (dual occ / low-rise)
- 10 m (townhouses)
- 12 m (mid-rise)
- 16 m+ (higher density)

**If height < 8.5 m:**

- Duplex may be difficult but possible if topography works.

**If height ≥ 10 m:**

- Terraces often viable.
- Some councils allow 3-storey low-rise.

---

## 3. Floor Space Ratio (LEP)

FSR is the main yield driver.

**Engine Logic**

```python
fsr = get_fsr(parcel_geom)
max_gfa = fsr * parcel.area_sqm
development_metrics.envelope.fsr_control = fsr
development_metrics.envelope.max_gfa_sqm = max_gfa
```

Typical NB FSRs:

- R2: 0.5–0.6
- R1: 0.6–0.7
- R3: 0.7–1.5

---

## 4. Minimum Lot Size (LEP)

Controls subdivision potential.

**Engine Logic**

```python
min_lot_size = get_mls(parcel_geom)
if parcel.area_sqm >= min_lot_size:
    subdivision_possible = True
```

Common values:

- 450–600 sqm in many R2/R1 zones
- 200–300 sqm in R3/R4 (for attached dwellings)

For duplex Torrens subdivision:

- Council may require ≥600–700 sqm combined or specific frontage rules.

---

## 5. Setbacks (LEP + DCP)

Setbacks impact build envelope, especially duplex siting.

**Generic Model (simplified)**

- **Front**: typically 6.0 m (or numeric average of streetscape)
- **Side**:
  - 0.9 m for single level
  - 1.5–2.0 m for two storey portions
- **Rear**: 6.0–8.0 m
- **Corner lot**: increased setbacks to secondary road

**Engine Logic**

Setbacks are populated from zone & DCP lookup:

```python
envelope.front_setback_m = front_setback_rule(zone, street_context)
envelope.side_setback_min_m = side_setback_rule(zone)
envelope.rear_setback_m = rear_setback_rule(zone, adjoining_properties)
```

---

## 6. Deep Soil & Landscaping (LEP + SEPP)

**Typical NB Requirements**

- Deep Soil: 10–20%
- Landscaped Area: 25–35%

**Engine Logic**

```python
envelope.deep_soil_required_sqm = deep_soil_percentage * parcel.area_sqm
envelope.landscaped_area_required_sqm = landscape_percentage * parcel.area_sqm
```

---

## 7. Typology Logic (Allowed Development Types)

This determines what can be built on the site under LEP/SEPP/DCP.

### 7.1 Dual Occupancy

**Allowed in:**

- R1, R2, R3 (area and frontage must comply)

**Typical requirements:**

- Min lot area ~ 600 sqm
- Min frontage ~ 15 m (varies)

**Engine:**

```python
if zone in ["R1", "R2", "R3"] and frontage >= min_frontage and area >= min_area:
    dual_occ_feasible = True
```

### 7.2 Terrace / Row Housing

**Allowed in:**

- R1, R3, sometimes R2 via DA only.

**Requires:**

- Adequate frontage
- Adjacent properties context
- Height/FSR compliance

### 7.3 Manor House (SEPP Housing Ch. 3)

- Usually for R1 & R2
- Must meet minimum lot size (~600 sqm)
- Height 8.5 m
- 3–4 units max depending on LEP

### 7.4 Multi-Dwelling Housing

**Allowed in:**

- R1, R3 (varies by LGA)

**Not allowed in:**

- R2 (in most councils)

### 7.5 Apartments (Residential Flat Building)

**Allowed in:**

- R3 and R4 (if height & FSR supports)

---

## 8. SEPP Housing Chapter 6 (LMR / TOD)

The LMR/TOD upgrade turns many R2/R1 lots into much higher yielding sites if they fall within 400 m (inner) or 800 m (outer) of a designated town centre.

**Engine Logic**

Use the `centre_access` outputs from `spatial_context`:

```python
if centre_access.inner_ring_400m:
    allow_lmr = True
    fsr_bonus = X%
    height_bonus = Y m
elif centre_access.outer_ring_800m:
    allow_lmr = partial
```

**What it enables**

- Multi-dwelling
- Terrace
- Manor House
- Increased height
- Increased FSR

The exact bonuses vary by adopted reforms; they should be configurable via `config/settings.py`.

---

## 9. CDC Rules (Low-Rise Housing Code)

CDC is a "rule book": if the lot meets every rule, CDC is permitted.

### CDC Eligibility Summary

A lot is CDC-eligible if:

- Not flood control lot
- Not bushfire-prone (or BAL ≤ 40)
- Not heritage item / HCA
- Lot size meets minimum
- Frontage meets minimum
- Setbacks & height fit
- Private open space & landscaping fit
- Stormwater disperses to street

**Engine Logic**

In `planning/cdc_low_rise.py`:

```python
cdc_ok = True
blocking_constraints = []

if constraints.bushfire_prone and BAL > 40:
    cdc_ok = False
    blocking_constraints.append("Bushfire (BAL > 40)")

if constraints.flood_prone:
    cdc_ok = False
    blocking_constraints.append("Flood control lot")

if constraints.heritage_item or constraints.heritage_conservation_area:
    cdc_ok = False
    blocking_constraints.append("Heritage constraint")

if parcel.frontage_m < min_frontage:
    cdc_ok = False
    blocking_constraints.append("Insufficient frontage")

if slope.mean_gradient_percent > 20:
    cdc_ok = False
    blocking_constraints.append("Slope too steep for CDC")
```

**Output:**

```json
"cdc_potential": {
  "is_potentially_cdc_compliant": false,
  "likely_pathway": "DA Only",
  "blocking_constraints": [ "Flood control lot", "Heritage" ]
}
```

---

## 10. DA Rules (General)

DA is flexible; compliance is judged on:

- Streetscape
- Bulk, scale
- Neighbour impacts
- Acoustic privacy
- Solar access
- Overshadowing
- Tree retention
- Flood/stormwater
- Bushfire

**Engine Logic**

In `planning/da_guidance.py`:

- Summarise key issues.
- Recommend required reports.
- Identify design elements likely to be conditioned (height, setbacks, landscaping).

**Example:**

```json
"da_potential": {
  "is_likely_supportable": true,
  "key_issues": [
    "Bulk and scale relative to adjacent single dwellings",
    "Streetscape consistency"
  ],
  "recommended_studies": [
    "Flood Study",
    "Bushfire Report",
    "Arborist Report"
  ]
}
```

---

## 11. Combining Controls into Development Envelope

The engine merges:

- Height
- FSR
- Setbacks
- Deep soil
- Slope
- Constraints
- Typology rules

To compute:

```json
"development_metrics": {
  "envelope": {
    "max_height_m": ...,
    "fsr_control": ...,
    "max_gfa_sqm": ...,
    "front_setback_m": ...,
    "rear_setback_m": ...,
    "side_setback_min_m": ...,
    "deep_soil_required_sqm": ...,
    "landscaped_area_required_sqm": ...
  }
}
```

This envelope then feeds yield, feasibility & suggested pathways.

---

## 12. Yield Engine (Final Layer)

Using zoning + envelope + constraints:

```python
if dual_occ_feasible:
    dwellings = 2
elif terrace_feasible:
    dwellings = number_of_terrace_units(parcel, envelope)
elif manor_feasible:
    dwellings = 3–4
elif multi_dwelling_feasible:
    dwellings = gfa_based_estimate(parcel, envelope)
else:
    dwellings = 1
```

Yield always respects:

- Max height
- Max GFA
- Deep soil
- Landscaping
- Setbacks
- Constraints ("red-flag" may zero-out a typology)

---

## 13. Final Planning Output Schema

Delivered in:

```json
"administrative": { ... },
"development_metrics": { ... },
"feasibility": { ... }
```

This makes DevGPT explainable and auditable — every outcome traces back to a rule in this file.

---

## 14. Testing & Validation

Tests in:

- `tests/test_planning_rules.py`
- `tests/test_yield_engine.py`
- `tests/test_cdc_low_rise.py`

**Must cover:**

- R1 / R2 / R3 zoning cases
- Height variations
- FSR high/low edge cases
- CDC pass/fail cases
- LMR centre distance cases (inner/outer/none)
- Bushfire/Flood/Heritage interactions
- Corner lot setbacks
- Multi-dwelling vs manor vs duplex exclusions

---

This planning rules engine is the backbone of development feasibility — precise and deterministic enough for automation, but configurable for future NSW housing reforms.
