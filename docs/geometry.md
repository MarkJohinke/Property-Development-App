# Geometry Engine – Frontage, Depth, Slope & Shape

This document defines **how we compute geometric properties** of a parcel from the NSW cadastre polygon.

All logic here should be implemented in:

- `geometry/polygon_ops.py`
- `geometry/boundaries.py`
- `geometry/centroid.py`
- `geometry/slope.py`

The goal: turn a raw cadastre polygon into **developer-usable metrics**:

- frontage  
- depth  
- side lengths  
- perimeter  
- regularity  
- corner-lot status  
- slope & fall direction  

---

## 1. Coordinate Systems

### 1.1 Analysis CRS

- Use a **projected CRS in metres** for all geometric calculations:
  - e.g. `EPSG:7856` (GDA2020 / MGA Zone 56) for Sydney / Northern Beaches
- Cadastre polygon is **reprojected into analysis CRS** before any length/area calculations.

### 1.2 Output CRS

- `geometry.coordinate_reference_system` = analysis CRS (e.g. `EPSG:7856`)
- `geometry.centroid` is returned **in WGS84** (lat/lon) for compatibility.

---

## 2. Core Helpers

### 2.1 Centroid

Function: `compute_centroid(polygon) -> (lat, lon)`

1. Take projected polygon (analysis CRS).
2. Compute centroid (Shapely `polygon.centroid`).
3. Reproject centroid to WGS84.
4. Return `{ "lat": ..., "lon": ... }`.

---

### 2.2 Perimeter and Area

- `perimeter_m` = `polygon.length` in analysis CRS.
- `area_sqm_computed` = `polygon.area` in analysis CRS.
- Compare with `parcel.area_sqm` from cadastre:
  - If discrepancy > 2–3%, log a warning and store both values.

These feed:

- `geometry.boundaries.perimeter_m`
- `parcel.area_sqm` (preferring cadastre official value if present).

---

## 3. Boundary Identification

We need to identify:

- **front boundary** (primary street frontage)  
- **rear boundary**  
- **side boundaries**  

### 3.1 Extract Outer Ring

From the polygon:

```python
exterior = polygon.exterior  # Shapely LinearRing
coords = list(exterior.coords)  # closed ring, first == last
```

Convert into line segments:

```python
segments = [
    ((x1, y1), (x2, y2))
    for ((x1, y1), (x2, y2)) in pairwise(coords)
]
```

Each segment has:

- **length** L = Euclidean distance in metres.
- **bearing** θ = angle from north, clockwise, in degrees (0–360).

### 3.2 Find Road-Adjacent Segments

Use the road reserve geometry (road polygon/line buffer):

1. Get road geometry for nearest road (from spatial_context step) – or do it here if not yet available.
2. Buffer the road geometry slightly (e.g. 0.1–0.5 m) to account for tiny gaps.
3. For each parcel segment, test `segment_buffer.intersects(road_buffer)`:
   - All intersecting segments are **frontage candidates**.
4. If no segments intersect road (weird but possible for flag lots / easements), fallback to:
   - Pick segment closest to nearest road centroid as "front".

### 3.3 Determine Front Boundary

Rules:

- If there are multiple frontage candidates:
  - Prefer the **longest contiguous chain** of segments along the road.
  - Merge collinear or near-collinear segments into one logical "front" boundary.
- Compute:
  - `front.length_m` = total length of merged chain.
  - `front.orientation_deg` = bearing of dominant direction (average bearing weighted by segment length).
  - `front.num_segments` = number of physical segments merged.

Store as:

```json
"geometry": {
  "boundaries": {
    "front": {
      "length_m": ...,
      "orientation_deg": ...,
      "num_segments": ...
    }
  },
  "frontage_m": ...
}
```

`frontage_m` is just `front.length_m` for convenience.

### 3.4 Rear Boundary

Find boundary opposite the front:

1. Compute the average front normal direction:
   - `rear_orientation ≈ (front.orientation_deg + 180) mod 360`
2. Among all non-front segments:
   - Pick the segment (or merged chain) with bearing within ±30° of `rear_orientation`.
   - If multiple candidates, choose the one **furthest from the road** (max distance to road centreline).

Store:

- `rear.length_m`, `rear.orientation_deg`, `rear.num_segments`.

If no clear rear boundary (highly irregular lots), fallback to:

- Pick the furthest edge from road centroid based on segment midpoint.

### 3.5 Side Boundaries

Remaining segments are classified as **side boundaries**:

- Group adjacent segments into left/right sides using:
  - proximity to front-left and front-right corners, or
  - angle relative to front bearing.

Heuristics (simple but effective):

1. Determine front boundary endpoints A (left) and B (right) when looking from road towards the lot.
2. For each side segment, compute closest endpoint (A or B) → assign to left or right.
3. Merge sequences on each side into a single left and right length.

Output:

```json
"geometry": {
  "boundaries": {
    "sides": [
      { "name": "left",  "length_m": 40.0, "orientation_deg": 0.0 },
      { "name": "right", "length_m": 40.0, "orientation_deg": 0.0 }
    ]
  },
  "depth_m": 40.0
}
```

`depth_m`:

- If both sides exist → use the **mean** of `left.length_m` and `right.length_m`.
- If only one side → use that side's length.

---

## 4. Corner-Lot Detection

A parcel is a **corner lot** if:

- It has road adjacency on more than one distinct side.

Algorithm:

1. Identify all parcel segments that intersect any road reserve geometry (not just the primary road).
2. Cluster those segments by road ID / name.
3. If the parcel has adjacency to **2+ distinct road geometries**, set:
   ```json
   "is_corner_lot": true
   ```

Optionally, store which boundaries are primary vs secondary frontage (future extension).

---

## 5. Regularity Index

We want a 0–1 metric describing how "rectangular" the lot is:

- **1.0** = perfect rectangle
- lower values = more irregular / scalloped / multi-angled

### 5.1 Definition

Let:

- A = parcel area (sqm)
- P = parcel perimeter (m)

For a given area A, the rectangle with minimum perimeter is a square:

- side s = sqrt(A)
- perimeter P_min = 4 * sqrt(A)

Define:

```
regularity_index_raw = P_min / P
regularity_index = clamp(regularity_index_raw, 0, 1)
```

Where `clamp` limits result to [0, 1].

### 5.2 Interpretation

- **>= 0.9** → "regular lot"
- **0.7–0.9** → "mildly irregular"
- **< 0.7** → "irregular lot"

Store as:

```json
"regularity_index": 0.93
```

---

## 6. Road Reserve Width

If road polygons or reserve boundaries are available:

1. Take the centroid of the front boundary (midpoint).
2. Project a line **perpendicular** to the front boundary across the road:
   - length ≈ 25–30 m (enough to cross entire reserve).
3. Intersect with road-reserve polygon, measure intersection length:
   - `road_reserve_width_m` = length(intersection)

If no road reserve dataset:

- Approximate using distance between parcel front edge and opposite parcel front edge, or leave null and just record a note.

---

## 7. Slope & Fall Direction

Implemented in `geometry/slope.py`.

We use a DEM/DSM raster for slope calculations.

### 7.1 Sample Grid

To avoid overkill:

1. Compute a regular grid of points inside the parcel:
   - e.g. every 2–5 m in both X and Y.
2. For each grid point:
   - Sample DEM elevation.
3. This produces a set `{ (x_i, y_i, z_i) }` for the parcel.

### 7.2 Mean & Max Gradient

Use finite differences:

For each grid point (except border), approximate local gradients:

```
dz_dx ≈ (z(x+Δx, y) - z(x-Δx, y)) / (2Δx)
dz_dy ≈ (z(x, y+Δy) - z(x, y-Δy)) / (2Δy)
```

Local gradient magnitude:

```
gradient = sqrt(dz_dx^2 + dz_dy^2)
gradient_percent = gradient * 100
```

Aggregate across parcel:

- `mean_gradient_percent` = mean of `gradient_percent`
- `max_gradient_percent` = max of `gradient_percent`

Store:

```json
"slope": {
  "mean_gradient_percent": 7.5,
  "max_gradient_percent": 14.0,
  "primary_fall_direction_deg": 180.0,
  "falls_to_street": true
}
```

### 7.3 Primary Fall Direction (Aspect)

For each point:

```python
aspect_rad = atan2(dz_dy, dz_dx)     # or atan2(-dz_dx, -dz_dy) depending on convention
aspect_deg = (aspect_rad * 180 / π)  # convert to degrees
# normalise to 0–360
if aspect_deg < 0: aspect_deg += 360
```

Then:

- `primary_fall_direction_deg` = circular mean of `aspect_deg`, weighted by gradient (steeper gradients weigh more).

### 7.4 Falls to Street?

We want a boolean `falls_to_street`.

Steps:

1. Take front boundary orientation:
   - `front_orientation_deg`
2. Compute vector from parcel centroid to road centroid (or front boundary midpoint):
   - `street_direction_deg`
3. Compare `primary_fall_direction_deg` to `street_direction_deg`:
   - If the angular difference ≤ threshold (e.g. 30–45°):
     - `"falls_to_street": true`
   - Otherwise → false.

This becomes a simple but powerful flag: stormwater falls to street vs rear.

---

## 8. Geometry Data in Output

In `ParcelAnalysisResult`:

```json
"geometry": {
  "coordinate_reference_system": "EPSG:7856",
  "polygon": { "type": "Polygon", "coordinates": [...] },
  "centroid": { "lat": -33.79, "lon": 151.26 },
  "boundaries": {
    "front": {
      "length_m": 15.2,
      "orientation_deg": 90.0,
      "num_segments": 1
    },
    "rear": {
      "length_m": 15.2,
      "orientation_deg": 270.0,
      "num_segments": 1
    },
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
},
"development_metrics": {
  "slope": {
    "mean_gradient_percent": 7.5,
    "max_gradient_percent": 14.0,
    "primary_fall_direction_deg": 180.0,
    "falls_to_street": true
  }
}
```

---

## 9. Testing & Edge Cases

### 9.1 Test Cases

Add unit tests for:

- Perfect rectangle lot (easy maths).
- Irregular polygon with chamfered corners.
- Flag lot (handle front boundary detection).
- Corner lot (two road adjacencies).
- Flat site DEM (slope ~0%).
- Steep site with clear fall direction.

### 9.2 Edge Conditions

- **Tiny slivers / multi-part polygons**:
  - Only use largest polygon for geometry calcs.
- **Self-intersections / invalid polygons**:
  - Run `polygon.buffer(0)` to clean geometry where needed.
- **DEM gaps**:
  - If DEM sampling fails, set slope metrics to null and mark in `metadata.notes`.

---

This geometry spec is the foundation for everything else – if this is wrong, all FSR, yield and feasibility logic is garbage. Treat this like a surveyor: precise and unforgiving.
