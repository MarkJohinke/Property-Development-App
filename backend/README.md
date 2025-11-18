# NSW Property Intelligence Engine

A comprehensive property analysis system for NSW parcels that evaluates geometric properties, planning constraints, development controls, and feasibility.

## Overview

The engine provides instant, automated property intelligence for property developers in New South Wales, Australia. It analyzes parcels through four integrated engines:

1. **Geometry Engine**: Computes frontage, depth, boundaries, regularity, slope
2. **Constraints Engine**: Evaluates bushfire, flood, heritage, geotechnical risks
3. **Planning Rules Engine**: LEP zoning, FSR, height, CDC/DA eligibility
4. **Feasibility Engine**: Yield calculations, risk rating, pathway recommendations

## Quick Start

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Running the API

```bash
# Set PYTHONPATH
export PYTHONPATH=/path/to/Property-Development-App:$PYTHONPATH

# Run FastAPI server
python -m backend.app.api.fastapi_app
```

The API will be available at `http://localhost:8000`

Interactive documentation: `http://localhost:8000/docs`

### Using the API

```bash
curl -X POST "http://localhost:8000/analyse_parcel" \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "address",
    "value": "3 Nield Avenue, Balgowlah NSW 2093"
  }'
```

### Using the Python API Directly

```python
from backend.app.pipeline.runner import analyse_parcel

result = analyse_parcel({
    'input_type': 'address',
    'value': '3 Nield Avenue, Balgowlah NSW 2093'
})

print(f"Frontage: {result['geometry']['frontage_m']} m")
print(f"Zone: {result['administrative']['zone']['code']}")
print(f"Indicative Dwellings: {result['development_metrics']['yield']['indicative_dwellings_count']}")
print(f"Risk Rating: {result['feasibility']['overall_risk_rating']}")
```

## Architecture

```
backend/app/
├── geometry/          # Geometry engine
│   ├── centroid.py
│   ├── polygon_ops.py
│   ├── boundaries.py
│   └── slope.py
├── analysis/          # Constraints & feasibility
│   ├── constraints_engine.py
│   ├── yield_engine.py
│   └── risk_engine.py
├── planning/          # Planning rules
│   ├── lep_rules.py
│   ├── cdc_low_rise.py
│   └── da_guidance.py
├── pipeline/          # Orchestration
│   └── runner.py
├── api/               # FastAPI app
│   ├── fastapi_app.py
│   └── schemas.py
└── config/            # Settings
    └── settings.py
```

## Output Structure

The engine returns a comprehensive `ParcelAnalysisResult`:

```json
{
  "input": { ... },
  "parcel": {
    "lot_number": "2",
    "plan_number": "228402",
    "area_sqm": 607
  },
  "geometry": {
    "frontage_m": 15.0,
    "depth_m": 40.0,
    "regularity_index": 0.891,
    "centroid": {"lat": -33.79, "lon": 151.26}
  },
  "constraints": {
    "bushfire_prone": false,
    "flood_prone": false,
    "heritage_item": false
  },
  "administrative": {
    "zone": {"code": "R1", "name": "General Residential"},
    "lga_name": "Northern Beaches Council"
  },
  "development_metrics": {
    "slope": {...},
    "envelope": {
      "max_height_m": 8.5,
      "fsr_control": 0.6,
      "max_gfa_sqm": 364.2
    },
    "yield": {
      "indicative_dwellings_count": 2,
      "dual_occ_feasible": true
    }
  },
  "feasibility": {
    "cdc_potential": {...},
    "da_potential": {...},
    "overall_risk_rating": "Low",
    "notes": "..."
  }
}
```

## Testing

```bash
# Run all tests
PYTHONPATH=/path/to/Property-Development-App pytest backend/tests/ -v

# Run geometry tests only
PYTHONPATH=/path/to/Property-Development-App pytest backend/tests/geometry/ -v
```

## Documentation

Comprehensive specifications are available in the `docs/` directory:

- `docs/architecture.md` - System architecture overview
- `docs/geometry.md` - Geometry engine specification
- `docs/constraints.md` - Constraints engine specification
- `docs/planning_rules.md` - Planning rules engine specification
- `docs/feasibility.md` - Feasibility engine specification

## Configuration

Settings can be customized in `backend/app/config/settings.py`:

- Analysis CRS (default: EPSG:7856 - GDA2020 / MGA Zone 56)
- Constraint weights for risk scoring
- CDC eligibility thresholds
- Minimum lot requirements
- Default setbacks and landscaping percentages

## Current Limitations

This is a production skeleton implementation with mock data for demonstration:

- Cadastre data is mocked (needs integration with NSW DCDB)
- Planning layers are mocked (needs integration with NSW Planning Portal)
- DEM/slope data is simplified (needs actual DEM raster processing)
- Road geometry is mocked (needs road network integration)

See individual module TODOs for specific integration points.

## Dependencies

- `shapely>=2.0.0` - Geometric operations
- `pyproj>=3.4.0` - Coordinate system transformations
- `numpy>=1.24.0` - Numerical operations
- `fastapi>=0.104.0` - API framework
- `pydantic>=2.0.0` - Data validation
- `pytest>=7.4.0` - Testing

## License

Copyright © 2025 Johinke Development. All rights reserved.

## Support

For questions or issues, contact the development team.
