"""
Main pipeline orchestrator for parcel analysis.

This is the core entry point that coordinates all analysis engines.
"""

from typing import Dict, Any
from datetime import datetime, timezone
from shapely.geometry import Polygon

# Import all engine modules
from backend.app.geometry import (
    compute_centroid,
    compute_area_perimeter,
    compute_regularity_index,
    identify_boundaries,
    compute_slope_metrics
)
from backend.app.analysis.constraints_engine import (
    evaluate_constraints,
    compute_constraint_severity,
    recommend_required_studies
)
from backend.app.planning.lep_rules import evaluate_lep_controls
from backend.app.planning.cdc_low_rise import evaluate_cdc_potential
from backend.app.planning.da_guidance import evaluate_da_potential
from backend.app.analysis.yield_engine import compute_yield
from backend.app.analysis.risk_engine import compute_risk_rating, generate_feasibility_notes
from backend.app.config.settings import get_settings


def analyse_parcel(user_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main orchestration pipeline.
    
    Accepts raw input (address, lot/DP, coordinates) and returns
    fully validated ParcelAnalysisResult.
    
    This is a simplified implementation that uses mock data for demonstration.
    In production, this would query real NSW spatial datasets.
    
    Args:
        user_input: Dictionary with input_type and value
    
    Returns:
        Complete parcel analysis result dictionary
    """
    settings = get_settings()
    
    # Step 1 – Input normalisation (simplified)
    input_data = normalise_input(user_input)
    
    # Step 2 – Parcel resolution (mock cadastre data)
    parcel_data, polygon = resolve_parcel(input_data)
    
    # Step 3 – Geometry engine
    geometry_data = compute_geometry(polygon, parcel_data)
    
    # Step 4 – Spatial context (mock data)
    spatial_context = build_spatial_context(parcel_data, geometry_data)
    
    # Step 5 – Constraints & overlays
    constraints = evaluate_constraints(polygon, geometry_data)
    constraint_severity = compute_constraint_severity(constraints)
    required_studies = recommend_required_studies(constraints)
    
    # Step 6 – Planning controls (LEP / SEPP)
    lep_data = evaluate_lep_controls(parcel_data, geometry_data)
    
    # Step 7 – Development metrics (slope, envelope, yield)
    slope_data = compute_slope_metrics(
        polygon,
        front_orientation_deg=geometry_data.get("boundaries", {}).get("front", {}).get("orientation_deg")
    )
    
    yield_data = compute_yield(
        parcel_data,
        geometry_data,
        lep_data["envelope"],
        lep_data["typologies"],
        constraints
    )
    
    # Step 8 – Feasibility engine (CDC, DA, risk rating)
    cdc_potential = evaluate_cdc_potential(
        parcel_data,
        geometry_data,
        constraints,
        slope_data
    )
    
    da_potential = evaluate_da_potential(
        parcel_data,
        geometry_data,
        constraints,
        slope_data,
        required_studies
    )
    
    overall_risk_rating = compute_risk_rating(
        constraints,
        constraint_severity,
        slope_data,
        geometry_data
    )
    
    feasibility_notes = generate_feasibility_notes(
        lep_data["admin"]["zone"]["code"],
        lep_data["envelope"]["fsr_control"],
        cdc_potential,
        da_potential,
        yield_data,
        constraints
    )
    
    # Step 9 – Assemble result
    result = {
        "input": input_data,
        "parcel": parcel_data,
        "geometry": geometry_data,
        "spatial_context": spatial_context,
        "administrative": lep_data["admin"],
        "constraints": constraints,
        "development_metrics": {
            "slope": slope_data,
            "envelope": lep_data["envelope"],
            "yield": yield_data
        },
        "feasibility": {
            "cdc_potential": cdc_potential,
            "da_potential": da_potential,
            "overall_risk_rating": overall_risk_rating,
            "notes": feasibility_notes
        },
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "engine_version": settings.ENGINE_VERSION,
            "source_system": settings.SOURCE_SYSTEM,
            "data_snapshots": [
                {"dataset_name": "NSW_DCDB", "version": "2025Q1"}
            ]
        }
    }
    
    return result


def normalise_input(user_input: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise user input."""
    input_type = user_input.get("input_type", "address")
    value = user_input.get("value", "")
    
    # Simplified - would implement proper geocoding in production
    return {
        "query_type": input_type,
        "raw_input": value,
        "resolved_address": value if input_type == "address" else None,
        "resolved_lot_plan": "Lot 2 DP228402",  # Mock
        "resolved_coordinates": {"lat": -33.7902, "lon": 151.2618}  # Mock
    }


def resolve_parcel(input_data: Dict[str, Any]) -> tuple:
    """Resolve parcel from cadastre (mock implementation)."""
    # Mock parcel data
    parcel_data = {
        "lot_number": "2",
        "plan_number": "228402",
        "plan_type": "DP",
        "rpd": "Lot 2 DP228402",
        "parcel_type": "Lot",
        "area_sqm": 607,
        "source_dataset": "NSW_DCDB_2025Q1",
        "spatial_accuracy_code": "SC2"
    }
    
    # Create mock polygon (15m x 40m = 600 sqm roughly)
    # Coordinates in EPSG:7856 (MGA Zone 56)
    polygon = Polygon([
        (360400, 6259000),
        (360415, 6259000),
        (360415, 6258960),
        (360400, 6258960),
        (360400, 6259000)
    ])
    
    return parcel_data, polygon


def compute_geometry(polygon: Polygon, parcel_data: Dict[str, Any]) -> Dict[str, Any]:
    """Compute all geometric properties."""
    settings = get_settings()
    
    # Centroid
    centroid = compute_centroid(polygon, settings.ANALYSIS_CRS)
    
    # Area and perimeter
    area_sqm, perimeter_m = compute_area_perimeter(polygon)
    
    # Regularity index
    regularity = compute_regularity_index(polygon)
    
    # Boundaries
    boundaries_data = identify_boundaries(polygon)
    
    # Extract frontage and depth
    frontage_m = boundaries_data.get("frontage_m", 0)
    depth_m = boundaries_data.get("depth_m", 0)
    
    # Corner lot detection (simplified - would use actual road data)
    is_corner_lot = False
    
    return {
        "coordinate_reference_system": settings.ANALYSIS_CRS,
        "polygon": {
            "type": "Polygon",
            "coordinates": [list(polygon.exterior.coords)]
        },
        "centroid": centroid,
        "boundaries": {
            "front": boundaries_data["front"],
            "rear": boundaries_data["rear"],
            "sides": boundaries_data["sides"],
            "perimeter_m": boundaries_data["perimeter_m"]
        },
        "frontage_m": frontage_m,
        "depth_m": depth_m,
        "regularity_index": regularity,
        "is_corner_lot": is_corner_lot
    }


def build_spatial_context(parcel_data: Dict[str, Any], geometry_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build spatial context (mock implementation)."""
    return {
        "adjacent_parcels": [
            {"lot_plan": "Lot 1 DP228402", "relationship": "side"},
            {"lot_plan": "Lot 3 DP228402", "relationship": "side"}
        ],
        "nearest_road": {
            "name": "Nield Avenue",
            "road_class": "local",
            "distance_m": 0.0,
            "is_primary_frontage": True
        },
        "road_reserve_width_m": 12,
        "centre_access": {
            "nearest_centre_name": "Balgowlah Local Centre",
            "distance_m": 530,
            "inner_ring_400m": False,
            "outer_ring_800m": True
        }
    }
