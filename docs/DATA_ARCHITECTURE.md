# 🏗️ NSW Property Intelligence – Data Architecture Summary

This module outlines the data sources and computation model used to power the **Johinke Developments Property Intelligence Engine (DevGPT)**.

The objective is to provide complete parcel-level planning feasibility using free NSW datasets, with optional add-ons for title and sales intelligence.

---

## ✅ 1. Cadastre (Parcel Geometry & Lot/DP) — Free

**Source:** NSW Cadastre Web Service (DCDB)  
**Purpose:** Provides the legal parcel boundary geometry used as the spatial anchor for all downstream analysis.

### Key Fields

- **Lot number**
- **DP number**
- **Parcel polygon** (GeoJSON/WKT)
- **Centroid** (computed)
- **Parcel area** (provided + recomputed)
- **LGA + locality** (attributes)

### Capabilities

- True parcel geometry for precision analysis
- Suitable for FSR, height, setbacks, slope, and envelope modelling

---

## ✅ 2. Survey Geometry (Boundary & Shape Calculations) — Computed

Derived directly from DCDB parcel geometry.

### Computed Values Include

- Front boundary length
- Rear boundary length
- Side boundaries (left/right)
- Parcel depth
- Site width at multiple sections
- Corner-lot detection
- Parcel regularity metric
- Road adjacency distance
- Road reserve width

**Tools:** GeoPandas / PostGIS / Shapely

---

## ✅ 3. Spatial Relationships — Computed

### Data Required

- DCDB cadastre
- NSW Transport Road Centreline
- NSW administrative boundaries

### Derived Metrics

- Distance to primary road
- Intersection with road reserve
- Adjacent parcel IDs
- Walkable buffers (200m–800m) for LMR/TOD modelling
- Town centre radii (400m inner / 800m outer)

---

## ✅ 4. Administrative Layers — Free

**Sources:** NSW Spatial Services, Planning Portal data services

### Joined Layers

- **Local Government Area (LGA)**
- **Locality / suburb**
- **Ward / DCP precinct**
- **Cadastral suburb code**
- **DCP/development precincts** (where available)

**Used for:** Planning pathway decisions & DCP rule application.

---

## ⚠️ 5. Title Metadata — Paid (Per-Site Optional)

**Source:** NSW LRS via authorised brokers  
**Cost:** $20–$45 per title

### Optional Fields

- Title reference
- Edition number / status
- Easements & covenants
- Registered dealings

**Use case:** Due-diligence stage, not feasibility stage.

---

## 🔧 6. Development-Relevant Derived Data — Computed

Using DEM/DSM + Cadastre:

### Slope Metrics

- Mean slope
- Max slope
- Slope direction (aspect)
- Cut/fill heuristics

### Envelope Modelling

- Primary street
- Secondary street
- Height plane
- Setback bands
- Deep soil & landscaping areas
- Overshadowing envelopes
- Daylight / solar access

**Use case:** Automated feasibility engine (CDC/DA/LMR/SEPP).

---

## 🧱 7. Constraints & Hazards — Free

**Sources:** NSW Spatial Services, Planning Portal, LGA GIS  
(All available via WMS/WFS endpoints)

### Layers Include

- **Bushfire prone land**
- **Flood planning levels**
- **Acid sulfate soils**
- **Coastal & foreshore building lines**
- **Riparian buffers / waterways**
- **Geotechnical / landslip risk**
- **Heritage items + conservation areas**
- **Biodiversity layers**
- **Environmental constraints**

**Applied via:** Spatial intersection with the cadastre.

---

## 🎯 Overall Strategy

### Core Engine is 100% Free

- NSW Cadastre
- Admin boundaries
- DEM/DSM
- Planning overlays
- Hazard datasets
- Road & transport datasets

Everything required for planning analysis (sections 1–4 & 7) is available **without licensing fees**.

### Optional Commercial Add-Ons

- **RP Data / Pricefinder** → Sales & valuation
- **LRS Broker** → Title & easements
- **Nearmap** → High-resolution imagery

These are used at specific workflow stages, not in the core computation engine.

---

## 🚀 DevGPT Architecture Overview

### 1. Input
**Address → Geocode → Lot/DP lookup → Parcel geometry fetch**

### 2. Geometry Engine (free)
**Boundary → frontage → depth → adjacency → slope**

### 3. Overlay Engine (free)
**Zone → height → DCP layers → constraints → hazards**

### 4. Compliance Engine (custom)
**CDC / DA / LMR / SEPP rules → automated pass/fail + parameters**

### 5. Feasibility Engine (custom)
**FSR → yield → envelopes → solar → landscape → market comps (optional paid)**

### 6. DD-Stage Add-Ons
- Title search (paid)
- Sales intel (paid)
- Imagery (optional paid)

---

## 📊 Architecture Flow Diagram

See [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md) for a visual representation of the data pipeline.

---

## 📁 Repository Structure

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for recommended organization of data modules.

---

## 📋 Data Schemas

See [PARCEL_ANALYSIS_SCHEMA.json](./PARCEL_ANALYSIS_SCHEMA.json) for the complete JSON schema of a Parcel Analysis Result.

---

## Summary

This repository module enables Johinke Developments to run full parcel-level planning feasibility using **free NSW government GIS datasets**, with optional commercial enhancements.

The architecture is optimised for:
- **Automation** - Minimal manual intervention
- **High accuracy** - Ground-truth data sources
- **Integration** - Ready for DevGPT agent ecosystem

---

## Additional Documentation

- [Architecture Flow Diagram](./ARCHITECTURE_FLOW.md)
- [Folder Structure Guide](./FOLDER_STRUCTURE.md)
- [Parcel Analysis Schema](./PARCEL_ANALYSIS_SCHEMA.json)

---

*This documentation is part of the Johinke Developments Property Intelligence platform.*
