# Feasibility Engine – Yield, Risk & Development Pathway

This document defines how the NSW Property Intelligence Engine (DevGPT) turns parcel geometry, zoning, overlays, controls, and constraints into **a final feasibility assessment**.

Core logic lives in:
- `analysis/yield_engine.py`
- `analysis/risk_engine.py`
- `planning/cdc_low_rise.py`
- `planning/da_guidance.py`

It produces the three key outputs in `ParcelAnalysisResult`:

```json
{
  "development_metrics": { ... },
  "feasibility": {
    "cdc_potential": { ... },
    "da_potential": { ... },
    "overall_risk_rating": "...",
    "notes": "..."
  }
}
```

---

## 1. Overview

Feasibility combines:

- Planning controls (height, FSR, zoning, LMR/TOD eligibility)
- Geometry (frontage, depth, slope, regularity, corner-lot)
- Constraints (bushfire, flood, heritage, geotech)
- Typology rules (dual occ, terrace, manor house, multi-dwelling)

The result is a developer-grade traffic-light assessment:

- **Green** → Strong site; CDC or simple DA
- **Amber** → Some risks; DA likely supportable
- **Red** → Non-viable or high-risk development

---

## 2. Yield Engine

The yield engine estimates what can be built on the site and how many dwellings it may support.

### 2.1 Typology Eligibility

Eligibility is determined through:

- Zoning
- Frontage
- Lot area
- SEPP/LMR eligibility
- Constraints
- Height/FSR limits
- Setbacks / deep soil / landscaping

**Logic Outline**

```python
dual_occ_ok = zone in ["R1", "R2", "R3"] and frontage >= min_frontage and area >= min_area

terrace_ok = zone in ["R1", "R3"] and fsr >= terrace_min_fsr

manor_ok = zone in ["R1", "R2"] and height <= 8.5 and area >= manor_min_area

multi_dwelling_ok = zone in ["R1", "R3"] and fsr >= multi_min_fsr
```

### 2.2 GFA-Based Yield

For typologies using GFA (multi-dwelling, RFB):

```python
estimated_units = floor(max_gfa_sqm / average_unit_gfa)
```

**Defaults:**

- 85–120 sqm for townhouses
- 60–80 sqm for apartments (if allowed)

### 2.3 Duplex Pathway

Duplex yield is always:

```python
indicative_dwellings_count = 2
```

Provided setbacks, height, and design envelope allow.

### 2.4 Output Example

```json
"development_metrics": {
  "yield": {
    "dual_occ_feasible": true,
    "terrace_row_feasible": false,
    "manor_house_feasible": false,
    "multi_dwelling_feasible": false,
    "indicative_dwellings_count": 2,
    "notes": "Conventional duplex site under LEP with 0.6:1 FSR and 8.5 m height."
  }
}
```

---

## 3. CDC Feasibility

Based on the Low-Rise Housing Code.

CDC is considered only for:

- Dual Occupancy
- New Dwelling
- Alterations/Additions
- Manor Houses & Terraces (if code permits)

### 3.1 Exclusion Rules (Automatic "No")

CDC is not allowed if:

- Bushfire category requires BAL > 40
- Flood control lot
- Heritage item
- Heritage conservation area
- Foreshore building line
- Riparian buffer
- Slope > 20%
- Lot size/frontage non-compliant
- Stormwater cannot be disposed to street
- Non-compliant envelope (setbacks/height)

**Engine:**

```python
blocks = []

if constraints.heritage_item or constraints.heritage_conservation_area:
    blocks.append("Heritage restriction")

if constraints.flood_prone:
    blocks.append("Flood control lot")

if constraints.bushfire_prone and bal > 40:
    blocks.append("Bushfire (BAL > 40)")

if frontage < min_frontage:
    blocks.append("Insufficient frontage")
```

**Final:**

```python
is_potentially_cdc_compliant = (len(blocks) == 0)
```

### CDC Output Example

```json
"cdc_potential": {
  "is_potentially_cdc_compliant": false,
  "likely_pathway": "DA Only",
  "blocking_constraints": [
    "Flood control lot",
    "Heritage restriction"
  ]
}
```

---

## 4. DA Feasibility

DA allows more flexibility, but the engine still identifies risks.

### 4.1 High-Risk Conditions

These trigger DA but with significant design controls:

- Geotechnical: moderate/high landslip
- Bushfire: Cat 1 vegetation
- Steep slope
- Irregular lot shape
- Major trees on site
- Flood (medium hazard)
- Sensitive neighbours

### 4.2 Recommended Studies

Based on constraints:

```python
studies = []

if constraints.bushfire_prone:
    studies.append("Bushfire Report")

if constraints.flood_prone:
    studies.append("Flood Study")

if constraints.geotech_landslip_risk in ["High", "Moderate"]:
    studies.append("Geotechnical Report")

if tree_canopy_overlap(parcel_geoms):
    studies.append("Arborist Report")
```

### DA Output Example

```json
"da_potential": {
  "is_likely_supportable": true,
  "key_issues": [
    "Bulk & scale considerations due to neighbouring 1-storey dwellings"
  ],
  "recommended_studies": [
    "Flood Study",
    "Bushfire Report"
  ]
}
```

---

## 5. Risk Engine — Overall Risk Rating

The risk engine produces a single risk score for the site.

### 5.1 Scoring Model

Each constraint contributes a score:

- Bushfire: 0–3
- Flood: 0–3
- Heritage: 0–3
- Geotech: 0–3
- Biodiversity: 0–2
- Misc: 0–1

Plus geometry factors:

- Slope > 15% → +2
- Slope > 25% → +3
- Irregular lot (regularity < 0.75) → +1
- Corner lot (positive/negative depending on context) → 0

### Final Score → Rating

| Score | Rating |
|-------|--------|
| 0–3 | Low |
| 4–7 | Medium |
| 8–12 | High |
| >12 | Red-Flag |

### Example

For a bushfire-prone, flood-prone, sloping site:

- Bushfire = 2
- Flood = 3
- Geotech (medium) = 1
- Slope (mean 20%) = 2
- **Total = 8 → High**

**Output:**

```json
"overall_risk_rating": "High"
```

---

## 6. Combining All Layers — Final Verdict

The final feasibility note is a human-readable synthesis generated by DevGPT:

### Example

```json
"notes": "Viable duplex site under LEP with 0.6:1 FSR. CDC unlikely due to flood constraints. DA pathway realistic with stormwater design and bushfire report."
```

**Guidelines for the notes:**

- One sentence on zoning/yield
- One sentence on CDC vs DA
- One sentence on key constraints
- One sentence on development pathway recommendation

---

## 7. Feasibility Output (Full Example)

```json
"feasibility": {
  "cdc_potential": {
    "is_potentially_cdc_compliant": false,
    "likely_pathway": "DA Only",
    "blocking_constraints": [
      "Bushfire (BAL > 40)",
      "Flood control lot"
    ]
  },
  "da_potential": {
    "is_likely_supportable": true,
    "key_issues": [
      "Slope and stormwater",
      "Bushfire vegetation proximity"
    ],
    "recommended_studies": [
      "Bushfire Assessment Report",
      "Flood Study",
      "Geotechnical Report"
    ]
  },
  "overall_risk_rating": "High",
  "notes": "CDC not permitted due to high BAL rating and flood control status. DA feasible with appropriate reports and stormwater controls. Likely a viable dual occupancy under LEP."
}
```

---

## 8. Testing Feasibility

Tests live in:

- `tests/test_yield_engine.py`
- `tests/test_cdc_low_rise.py`
- `tests/test_risk_engine.py`

**Test Cases:**

- Flat, regular, no-constraints lot → Low risk, CDC OK.
- Flood-only site → CDC no, DA yes.
- Bushfire Cat 1 + slope 20% → High risk.
- Heritage item → CDC impossible, DA challenging.
- LMR site inside 400 m → multi-dwelling feasible.
- R2 lot, <600 sqm → no duplex, single dwelling only.

---

## 9. Future Extensions

- Sensitivity modelling (yield vs height/FSR envelopes)
- Residual land value calculations
- Development cost estimation (integration with feasibility model)
- Parking & traffic impact heuristics
- Rear lane access recognition
- Intelligent stormwater fall direction modelling
- Tree protection overlays (significant trees)

---

This feasibility engine brings everything together into one clear developer-level verdict, suitable for instant assessments, automated feasibility tools, and high-throughput site scanning.
