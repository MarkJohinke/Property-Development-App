# NSW Property Intelligence - Documentation Hub

Welcome to the documentation for the **Johinke Developments Property Intelligence Engine (DevGPT)**.

This documentation suite provides comprehensive information about the data architecture, system design, and implementation guidelines for building automated property development feasibility analysis using NSW government datasets.

---

## 📚 Documentation Overview

### 🚀 Start Here

| Document | Description |
|----------|-------------|
| [**ENGINE_OVERVIEW.md**](./ENGINE_OVERVIEW.md) | **← START HERE** - High-level overview of the NSW Property Intelligence Engine (DevGPT), core capabilities, and processing pipeline |

### Core Documentation

| Document | Description |
|----------|-------------|
| [**DATA_ARCHITECTURE.md**](./DATA_ARCHITECTURE.md) | Complete overview of data sources, computation model, and strategy for the Property Intelligence Engine |
| [**ARCHITECTURE_FLOW.md**](./ARCHITECTURE_FLOW.md) | Visual flow diagrams and processing pipeline details with Mermaid diagrams |
| [**FOLDER_STRUCTURE.md**](./FOLDER_STRUCTURE.md) | Recommended repository organization and module structure |
| [**PARCEL_ANALYSIS_SCHEMA.json**](./PARCEL_ANALYSIS_SCHEMA.json) | JSON schema for Parcel Analysis Result data structure |

---

## 🎯 Quick Start

### For Developers
1. **Start with [ENGINE_OVERVIEW.md](./ENGINE_OVERVIEW.md)** to understand the system at a high level
2. Read [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) to understand the 7-layer data model
3. Review [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md) to see how data flows through the system
4. Check [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for implementation guidance
5. Use [PARCEL_ANALYSIS_SCHEMA.json](./PARCEL_ANALYSIS_SCHEMA.json) for API contracts

### For Project Managers
- [ENGINE_OVERVIEW.md](./ENGINE_OVERVIEW.md) - High-level system overview and capabilities
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Understanding data costs and sources
- [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md) - System capabilities and processing stages

### For Data Scientists
- [ENGINE_OVERVIEW.md](./ENGINE_OVERVIEW.md) - Processing pipeline and output structure
- [PARCEL_ANALYSIS_SCHEMA.json](./PARCEL_ANALYSIS_SCHEMA.json) - Complete data schema
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Computed metrics and derivations

### For Stakeholders
- [ENGINE_OVERVIEW.md](./ENGINE_OVERVIEW.md) - Complete system overview, benefits, and use cases

---

## 🏗️ System Components

The Property Intelligence Engine consists of 7 major components:

1. **Cadastre Layer** (Free) - NSW DCDB parcel geometry and legal identifiers
2. **Geometry Engine** (Computed) - Boundary, frontage, depth, and slope calculations
3. **Spatial Relationships** (Computed) - Adjacency, buffers, and TOD analysis
4. **Administrative Layers** (Free) - LGA, locality, and DCP precinct mapping
5. **Title Metadata** (Paid - Optional) - NSW LRS title search for due diligence
6. **Derived Data** (Computed) - Slope metrics, building envelopes, solar access
7. **Constraints & Hazards** (Free) - Bushfire, flood, heritage, environmental overlays

### Custom Engines

- **Compliance Engine** - CDC, DA, LMR, and SEPP rule checking
- **Feasibility Engine** - FSR, yield, envelope, and landscape calculations

---

## 💡 Key Features

### 100% Free Core Analysis
All data required for planning feasibility (components 1-4, 6-7) is available **without licensing fees** from NSW Government open data sources.

### Optional Commercial Add-Ons
- NSW LRS Title Search: $20-45 per parcel
- RP Data / Pricefinder: Sales and valuation data
- Nearmap: High-resolution aerial imagery

### Automated Processing
- Address → Full feasibility report in 5-15 seconds
- Batch processing for portfolio analysis
- Caching strategy for performance optimization

---

## 📊 Data Architecture Summary

```
Input: NSW Address
    ↓
[FREE] Cadastre + Boundaries + Elevation + Planning Overlays
    ↓
[COMPUTED] Geometry Analysis + Spatial Relationships
    ↓
[CUSTOM] Compliance Rules + Feasibility Modelling
    ↓
[PAID - Optional] Title Search + Sales Data + Imagery
    ↓
Output: Comprehensive Development Report
```

---

## 🔗 Related Documentation

### Main Repository Documentation
- [Main README](../README.md) - Project overview and getting started
- [AGENTS.md](../AGENTS.md) - Repository guidelines and coding standards

### External References
- [NSW Spatial Services](https://portal.spatial.nsw.gov.au/) - Data Portal
- [NSW Planning Portal](https://www.planningportal.nsw.gov.au/) - Planning information
- [NSW Legislation](https://legislation.nsw.gov.au/) - Planning acts and SEPPs

---

## 🚀 Implementation Roadmap

### Phase 1: Free Data Integration ✅ (Current Focus)
- NSW Cadastre (DCDB) integration
- Geometry computation engine
- Administrative layer lookup
- Basic constraints overlay

### Phase 2: Compliance Engine 🚧 (In Progress)
- CDC rule engine
- DA pathway logic
- LMR SEPP eligibility
- SEPP checks framework

### Phase 3: Feasibility Engine 📋 (Planned)
- FSR calculations
- Yield estimation
- Building envelope modelling
- Solar access analysis
- Landscape requirement calculations

### Phase 4: Commercial Integrations 🔮 (Future)
- NSW LRS title search API
- RP Data / Pricefinder integration
- Nearmap imagery integration

### Phase 5: Advanced Features 🔮 (Future)
- Machine learning for yield prediction
- 3D envelope visualisation
- Automated DA documentation generation
- Precedent analysis database

---

## 📐 Technical Stack

### Backend (Planned)
- **Python 3.11+** - Core language
- **FastAPI** - REST API framework
- **GeoPandas** - Spatial operations
- **Shapely** - Geometric calculations
- **PostGIS** - Spatial database
- **Rasterio** - Raster data processing

### Frontend (Current)
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Google Maps API** - Geocoding and mapping
- **React** - UI components

### Data Sources (Free)
- NSW Cadastre Web Service (DCDB)
- NSW Spatial Services WMS/WFS
- NSW Planning Portal ArcGIS REST
- NSW Transport Road Network
- Digital Elevation Model (DEM)

---

## 📖 Usage Examples

### Example 1: Basic Parcel Analysis
```typescript
// Frontend API call
const response = await fetch('/api/nswPlanningAtPoint', {
  method: 'POST',
  body: JSON.stringify({
    address: '123 Example Street, Sydney NSW 2000'
  })
});

const analysis = await response.json();
// Returns complete ParcelAnalysisResult per schema
```

### Example 2: Compliance Check
```python
# Backend service call (planned)
from app.services.compliance import check_cdc_eligibility

result = check_cdc_eligibility(
    parcel_id="LOT 1 DP 123456",
    zone="R2",
    area_sqm=650,
    constraints=constraints_data
)
```

### Example 3: Feasibility Calculation
```python
# Backend service call (planned)
from app.services.feasibility import calculate_development_potential

potential = calculate_development_potential(
    parcel=parcel_data,
    geometry=geometry_data,
    planning=planning_data
)
```

---

## 🤝 Contributing

When contributing to the Property Intelligence Engine:

1. Follow the [repository guidelines](../AGENTS.md)
2. Use the [folder structure](./FOLDER_STRUCTURE.md) for new modules
3. Ensure new data conforms to the [JSON schema](./PARCEL_ANALYSIS_SCHEMA.json)
4. Document data sources and update architecture docs
5. Write tests for all new computations
6. Update this documentation hub as needed

---

## 📄 License & Usage

This documentation and codebase is proprietary to **Johinke Developments**.

### Data Attribution
When using NSW Government data, ensure compliance with:
- [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- Attribution to "NSW Spatial Services" or specific agency as required

---

## 📧 Contact & Support

For questions or support regarding the Property Intelligence Engine:

- **Technical Issues**: Open a GitHub issue
- **Data Questions**: Refer to [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md)
- **Architecture Queries**: Review [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md)

---

## 🔄 Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-11-17 | Initial data architecture documentation |

---

## 📝 Document Maintenance

This documentation hub is maintained alongside the codebase. When making significant changes:

1. Update the relevant documentation files
2. Update version history
3. Update related links and cross-references
4. Keep schema in sync with implementation
5. Add examples for new features

---

*Last updated: November 2025*
