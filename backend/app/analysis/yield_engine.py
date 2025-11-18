"""
Yield engine for estimating development potential and dwelling count.
"""

import math
from typing import Dict, Any


def compute_yield(
    parcel_data: Dict[str, Any],
    geometry_data: Dict[str, Any],
    envelope_data: Dict[str, Any],
    typologies: Dict[str, bool],
    constraints: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compute development yield (dwelling count and typology feasibility).
    
    Args:
        parcel_data: Parcel information
        geometry_data: Geometric properties
        envelope_data: Development envelope (FSR, height, setbacks)
        typologies: Allowed typologies from LEP
        constraints: Constraint evaluation results
    
    Returns:
        Dictionary with yield assessment
    """
    from backend.app.config.settings import get_settings
    settings = get_settings()
    
    parcel_area = parcel_data.get("area_sqm", 600)
    frontage = geometry_data.get("frontage_m", 15)
    max_gfa_sqm = envelope_data.get("max_gfa_sqm", 0)
    fsr_control = envelope_data.get("fsr_control", 0.6)
    max_height_m = envelope_data.get("max_height_m", 8.5)
    
    # Check typology feasibility considering constraints
    dual_occ_feasible = (
        typologies.get("dual_occupancy", False) and
        not constraints.get("heritage_item") and
        parcel_area >= settings.MIN_LOT_AREA_DUAL_OCC_SQM and
        frontage >= settings.MIN_FRONTAGE_DUAL_OCC_M
    )
    
    terrace_row_feasible = (
        typologies.get("terrace_row", False) and
        fsr_control >= settings.MIN_FSR_TERRACE and
        not constraints.get("heritage_item")
    )
    
    manor_house_feasible = (
        typologies.get("manor_house", False) and
        max_height_m <= 8.5 and
        parcel_area >= 600 and
        not constraints.get("heritage_item")
    )
    
    multi_dwelling_feasible = (
        typologies.get("multi_dwelling", False) and
        fsr_control >= settings.MIN_FSR_MULTI_DWELLING and
        not constraints.get("heritage_item")
    )
    
    # Calculate indicative dwelling count
    indicative_dwellings = 1  # Default to single dwelling
    primary_typology = "Single Dwelling"
    
    if dual_occ_feasible:
        indicative_dwellings = 2
        primary_typology = "Dual Occupancy"
    elif manor_house_feasible:
        indicative_dwellings = 3  # Typical manor house
        primary_typology = "Manor House"
    elif multi_dwelling_feasible:
        # GFA-based calculation
        estimated_units = math.floor(max_gfa_sqm / settings.AVERAGE_UNIT_SIZE_TOWNHOUSE_SQM)
        indicative_dwellings = max(2, min(6, estimated_units))  # Cap at 6 for realism
        primary_typology = "Multi-Dwelling Housing"
    elif terrace_row_feasible:
        # Simplified terrace calculation
        estimated_units = math.floor(max_gfa_sqm / settings.AVERAGE_UNIT_SIZE_TOWNHOUSE_SQM)
        indicative_dwellings = max(3, min(6, estimated_units))
        primary_typology = "Terrace/Row Housing"
    
    # Generate notes
    notes = generate_yield_notes(
        primary_typology,
        fsr_control,
        max_height_m,
        dual_occ_feasible,
        constraints
    )
    
    return {
        "dual_occ_feasible": dual_occ_feasible,
        "terrace_row_feasible": terrace_row_feasible,
        "manor_house_feasible": manor_house_feasible,
        "multi_dwelling_feasible": multi_dwelling_feasible,
        "indicative_dwellings_count": indicative_dwellings,
        "primary_typology": primary_typology,
        "notes": notes
    }


def generate_yield_notes(
    primary_typology: str,
    fsr: float,
    height: float,
    dual_occ_feasible: bool,
    constraints: Dict[str, Any]
) -> str:
    """
    Generate human-readable yield notes.
    
    Args:
        primary_typology: Primary development typology
        fsr: Floor space ratio
        height: Maximum height in metres
        dual_occ_feasible: Whether dual occupancy is feasible
        constraints: Constraint evaluation results
    
    Returns:
        Yield notes string
    """
    if dual_occ_feasible:
        notes = f"Standard {primary_typology} envelope with {fsr}:1 FSR and {height} m height."
    else:
        notes = f"{primary_typology} under LEP controls ({fsr}:1 FSR, {height} m height)."
    
    # Add constraint context
    if constraints.get("heritage_item"):
        notes += " Heritage restrictions significantly limit development potential."
    elif constraints.get("bushfire_prone"):
        notes += " Bushfire controls may affect building envelope."
    
    return notes
