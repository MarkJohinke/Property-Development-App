# DevGPT Architecture Flow Diagram

This document provides a visual representation of the NSW Property Intelligence data pipeline and processing flow.

---

## System Architecture Overview

```mermaid
graph TB
    subgraph Input["1. INPUT LAYER"]
        A[Address Input] --> B[Geocoding Service]
        B --> C[Lot/DP Lookup]
        C --> D[Parcel Geometry Fetch]
    end

    subgraph Free["FREE DATA SOURCES"]
        E1[NSW Cadastre DCDB]
        E2[NSW Transport Roads]
        E3[Admin Boundaries]
        E4[DEM/DSM Elevation]
        E5[Planning Portal]
        E6[Hazard Datasets]
    end

    subgraph Geometry["2. GEOMETRY ENGINE (Free)"]
        F[Parcel Analysis]
        F --> F1[Boundary Calculations]
        F --> F2[Frontage/Depth]
        F --> F3[Corner Detection]
        F --> F4[Slope Analysis]
    end

    subgraph Overlay["3. OVERLAY ENGINE (Free)"]
        G[Spatial Intersection]
        G --> G1[Zoning Layer]
        G --> G2[Height Limits]
        G --> G3[DCP Rules]
        G --> G4[Constraints]
        G --> G5[Hazards]
    end

    subgraph Compliance["4. COMPLIANCE ENGINE (Custom)"]
        H[Rule Engine]
        H --> H1[CDC Rules]
        H --> H2[DA Requirements]
        H --> H3[LMR Eligibility]
        H --> H4[SEPP Checks]
        H --> H5[Pass/Fail + Parameters]
    end

    subgraph Feasibility["5. FEASIBILITY ENGINE (Custom)"]
        I[Development Model]
        I --> I1[FSR Calculation]
        I --> I2[Yield Estimation]
        I --> I3[Envelope Modelling]
        I --> I4[Solar Access]
        I --> I5[Landscape Requirements]
        I --> I6[Market Analysis]
    end

    subgraph Optional["6. OPTIONAL PAID SERVICES"]
        J1[Title Search<br/>$20-45/title]
        J2[Sales Intelligence<br/>RP Data/Pricefinder]
        J3[Aerial Imagery<br/>Nearmap]
    end

    subgraph Output["OUTPUT"]
        K[Comprehensive Report]
        K --> K1[Feasibility Summary]
        K --> K2[Compliance Status]
        K --> K3[Development Options]
        K --> K4[Constraints Map]
        K --> K5[Financial Estimates]
    end

    %% Data flow connections
    D --> E1
    E1 --> F
    E2 --> F
    E3 --> F
    E4 --> F

    F --> G
    E5 --> G
    E6 --> G

    G --> H
    H --> I

    I --> K
    J1 -.Optional.-> K
    J2 -.Optional.-> K
    J3 -.Optional.-> K

    %% Styling
    classDef freeData fill:#90EE90,stroke:#228B22,stroke-width:2px
    classDef computed fill:#87CEEB,stroke:#4682B4,stroke-width:2px
    classDef custom fill:#FFD700,stroke:#FF8C00,stroke-width:2px
    classDef paid fill:#FFB6C1,stroke:#DC143C,stroke-width:2px
    classDef output fill:#DDA0DD,stroke:#8B008B,stroke-width:2px

    class E1,E2,E3,E4,E5,E6 freeData
    class F,F1,F2,F3,F4,G,G1,G2,G3,G4,G5 computed
    class H,H1,H2,H3,H4,H5,I,I1,I2,I3,I4,I5,I6 custom
    class J1,J2,J3 paid
    class K,K1,K2,K3,K4,K5 output
```

---

## Processing Pipeline Detail

### Stage 1: Input Processing
1. **Address Entry** → User provides NSW address
2. **Geocoding** → Convert to coordinates (Google Maps / Nominatim)
3. **Lot/DP Lookup** → Identify legal parcel identifiers
4. **Geometry Fetch** → Retrieve parcel polygon from DCDB

### Stage 2: Geometry Engine (Free)
Using NSW Cadastre data:
- Calculate frontage, depth, side boundaries
- Detect corner lots and irregular shapes
- Compute slope from DEM data
- Measure road adjacency

### Stage 3: Overlay Engine (Free)
Spatial intersection with:
- Zoning maps (R1, R2, R3, R4, B1-B8, etc.)
- Height limit maps
- DCP layers (precinct controls)
- Environmental constraints
- Hazard zones (bushfire, flood, etc.)

### Stage 4: Compliance Engine (Custom Logic)
Rule-based assessment:
- **CDC (Complying Development)** - Check against codes
- **DA (Development Application)** - Required pathways
- **LMR (Low Rise Medium Density)** - SEPP eligibility
- **Other SEPPs** - Affordable housing, infrastructure, etc.

### Stage 5: Feasibility Engine (Custom)
Development modelling:
- Apply FSR (Floor Space Ratio)
- Calculate unit yield
- Model building envelopes
- Check solar access compliance
- Calculate deep soil & landscaping
- Optional: Market comparables

### Stage 6: Due Diligence Add-Ons (Paid - Optional)
- **Title Search**: Easements, covenants, encumbrances
- **Sales Data**: Recent comparable sales, valuation
- **Imagery**: High-res aerial photos, 3D models

---

## Data Flow Summary

```
Address Input
    ↓
[FREE] Cadastre + Boundaries + Elevation
    ↓
[COMPUTED] Geometry + Spatial Analysis
    ↓
[FREE] Planning Overlays + Constraints
    ↓
[CUSTOM] Compliance Rules + Feasibility Model
    ↓
[PAID - Optional] Title + Sales + Imagery
    ↓
Comprehensive Development Report
```

---

## Technology Stack

### Spatial Processing
- **GeoPandas** - Python spatial operations
- **PostGIS** - Spatial database queries
- **Shapely** - Geometric calculations
- **GDAL** - Raster/vector conversions

### Data Sources
- **NSW Spatial Services** - WMS/WFS endpoints
- **NSW Planning Portal** - ArcGIS REST services
- **Google Maps API** - Geocoding & places
- **OpenStreetMap** - Backup geocoding (Nominatim)

### Application Layer
- **Next.js 14+** - Frontend framework
- **FastAPI** (planned) - Backend computation engine
- **TypeScript** - Type-safe development
- **React** - UI components

---

## Cost Structure

| Component | Cost | Required For |
|-----------|------|-------------|
| NSW Cadastre | **Free** | Core geometry |
| Planning overlays | **Free** | Zoning & rules |
| Elevation data | **Free** | Slope analysis |
| Transport data | **Free** | TOD analysis |
| Hazard data | **Free** | Risk assessment |
| **Total Core** | **$0** | **Feasibility stage** |
| Title search | $20-45 | Due diligence |
| Sales data | Subscription | Market analysis |
| Aerial imagery | Subscription | Site context |

---

## Performance Considerations

### Real-time Processing
- **Geocoding**: < 1 second
- **Geometry fetch**: 1-3 seconds
- **Spatial overlays**: 2-5 seconds
- **Compliance engine**: 1-2 seconds
- **Total response**: 5-15 seconds typical

### Caching Strategy
- Cache parcel geometry (30 days)
- Cache planning overlays (7 days)
- Cache DEM tiles (90 days)
- Invalidate on planning instrument updates

### Scalability
- Async processing for batch jobs
- Queue system for high-volume requests
- CDN for static data layers
- Database indexing for spatial queries

---

## Future Enhancements

1. **Machine Learning Integration**
   - Automated precedent analysis
   - Development yield prediction
   - Market trend forecasting

2. **3D Visualisation**
   - WebGL building envelopes
   - Solar access animation
   - Neighbourhood context models

3. **Workflow Automation**
   - Auto-generate DA documentation
   - Compliance report generation
   - Cost estimation refinement

4. **Extended Coverage**
   - Interstate cadastres (VIC, QLD, etc.)
   - Additional data sources
   - Custom DCP rule libraries

---

*This flow diagram is maintained as part of the Data Architecture documentation.*
