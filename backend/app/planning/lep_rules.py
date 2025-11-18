"""
LEP (Local Environmental Plan) rules evaluation.
"""

from typing import Dict, Any


def evaluate_lep_controls(
    parcel_data: Dict[str, Any],
    geometry_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate LEP controls (zoning, height, FSR, setbacks).
    
    This is a simplified implementation with mock data.
    In production, this would query NSW Planning Portal spatial layers.
    
    Args:
        parcel_data: Parcel information
        geometry_data: Geometric properties
    
    Returns:
        Dictionary with LEP controls and administrative data
    """
    from backend.app.config.settings import get_settings
    settings = get_settings()
    
    # Mock zoning data (would be queried from spatial layers)
    zone_code = "R1"
    zone_name = "General Residential"
    
    # Mock height and FSR (would be queried from spatial layers)
    max_height_m = 8.5
    fsr_control = 0.6
    
    # Calculate max GFA
    parcel_area = parcel_data.get("area_sqm", 600)
    max_gfa_sqm = fsr_control * parcel_area
    
    # Determine allowed typologies based on zone
    typologies = determine_allowed_typologies(zone_code, parcel_area, geometry_data)
    
    # Calculate setbacks
    setbacks = calculate_setbacks(zone_code, geometry_data)
    
    # Calculate landscaping requirements
    deep_soil_required_sqm = parcel_area * settings.DEEP_SOIL_PERCENTAGE
    landscaped_area_required_sqm = parcel_area * settings.LANDSCAPED_AREA_PERCENTAGE
    
    return {
        "admin": {
            "lga_name": "Northern Beaches Council",
            "locality": "Balgowlah",
            "ward": "Manly Ward",
            "planning_authority": "Northern Beaches Council",
            "planning_instruments": [
                {"code": "NBLEP", "name": "Northern Beaches LEP", "version": "2023"},
                {"code": "SEPP_HOUSING_CH6", "name": "Housing SEPP Ch. 6", "version": "2024"}
            ],
            "zone": {
                "code": zone_code,
                "name": zone_name,
                "instrument": "Northern Beaches LEP"
            }
        },
        "envelope": {
            "max_height_m": max_height_m,
            "fsr_control": fsr_control,
            "max_gfa_sqm": round(max_gfa_sqm, 1),
            "front_setback_m": setbacks["front"],
            "rear_setback_m": setbacks["rear"],
            "side_setback_min_m": setbacks["side"],
            "deep_soil_required_sqm": round(deep_soil_required_sqm, 1),
            "landscaped_area_required_sqm": round(landscaped_area_required_sqm, 1)
        },
        "typologies": typologies
    }


def determine_allowed_typologies(
    zone_code: str,
    parcel_area_sqm: float,
    geometry_data: Dict[str, Any]
) -> Dict[str, bool]:
    """
    Determine which development typologies are allowed.
    
    Args:
        zone_code: LEP zone code (e.g., "R1", "R2", "R3")
        parcel_area_sqm: Parcel area in square metres
        geometry_data: Geometric properties
    
    Returns:
        Dictionary of typology feasibility flags
    """
    from backend.app.config.settings import get_settings
    settings = get_settings()
    
    frontage_m = geometry_data.get("frontage_m", 0)
    
    typologies = {
        "dual_occupancy": False,
        "terrace_row": False,
        "manor_house": False,
        "multi_dwelling": False,
        "apartments": False
    }
    
    # Dual occupancy rules
    if zone_code in ["R1", "R2", "R3"]:
        if (parcel_area_sqm >= settings.MIN_LOT_AREA_DUAL_OCC_SQM and
            frontage_m >= settings.MIN_FRONTAGE_DUAL_OCC_M):
            typologies["dual_occupancy"] = True
    
    # Terrace/row housing
    if zone_code in ["R1", "R3"]:
        typologies["terrace_row"] = True
    
    # Manor house (SEPP Housing Ch. 3)
    if zone_code in ["R1", "R2"]:
        if parcel_area_sqm >= 600:  # Typical minimum
            typologies["manor_house"] = True
    
    # Multi-dwelling
    if zone_code in ["R1", "R3"]:
        typologies["multi_dwelling"] = True
    
    # Apartments (RFB)
    if zone_code in ["R3", "R4"]:
        typologies["apartments"] = True
    
    return typologies


def calculate_setbacks(
    zone_code: str,
    geometry_data: Dict[str, Any]
) -> Dict[str, float]:
    """
    Calculate required setbacks based on zone and context.
    
    Args:
        zone_code: LEP zone code
        geometry_data: Geometric properties
    
    Returns:
        Dictionary with setback values
    """
    from backend.app.config.settings import get_settings
    settings = get_settings()
    
    # Simplified setback logic
    # In production, would consider DCP, streetscape context, etc.
    
    setbacks = {
        "front": settings.DEFAULT_FRONT_SETBACK_M,
        "rear": settings.DEFAULT_REAR_SETBACK_M,
        "side": settings.DEFAULT_SIDE_SETBACK_MIN_M
    }
    
    # Corner lot adjustments (if applicable)
    if geometry_data.get("is_corner_lot", False):
        setbacks["side"] = 3.0  # Increased for corner lots
    
    return setbacks
