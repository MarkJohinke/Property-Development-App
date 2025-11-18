"""
CDC (Complying Development Certificate) eligibility assessment for Low-Rise Housing Code.
"""

from typing import Dict, Any, List


def evaluate_cdc_potential(
    parcel_data: Dict[str, Any],
    geometry_data: Dict[str, Any],
    constraints: Dict[str, Any],
    slope_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate CDC eligibility under Low-Rise Housing Code.
    
    CDC is a "rule book" - if the lot meets every criterion, CDC is permitted.
    Otherwise, DA is required.
    
    Args:
        parcel_data: Parcel information
        geometry_data: Geometric properties
        constraints: Constraint evaluation results
        slope_data: Slope metrics
    
    Returns:
        Dictionary with CDC potential assessment
    """
    from backend.app.config.settings import get_settings
    settings = get_settings()
    
    blocking_constraints = []
    
    # 1. Bushfire constraints
    if constraints.get("bushfire_prone"):
        # Assume BAL > 40 blocks CDC (would check actual BAL in production)
        blocking_constraints.append("Bushfire (BAL > 40 requires report)")
    
    # 2. Flood constraints
    if constraints.get("flood_prone"):
        blocking_constraints.append("Flood control lot")
    
    # 3. Heritage constraints
    if constraints.get("heritage_item"):
        blocking_constraints.append("Heritage Item")
    
    if constraints.get("heritage_conservation_area"):
        blocking_constraints.append("Heritage Conservation Area")
    
    # 4. Foreshore building line
    if constraints.get("foreshore_building_line"):
        blocking_constraints.append("Foreshore Building Line")
    
    # 5. Riparian buffer
    if constraints.get("riparian_buffer"):
        blocking_constraints.append("Riparian Buffer")
    
    # 6. Lot size and frontage
    parcel_area = parcel_data.get("area_sqm", 0)
    frontage = geometry_data.get("frontage_m", 0)
    
    if parcel_area < settings.MIN_LOT_AREA_DUAL_OCC_SQM:
        blocking_constraints.append(f"Insufficient lot area ({parcel_area:.0f} sqm)")
    
    if frontage < settings.MIN_FRONTAGE_DUAL_OCC_M:
        blocking_constraints.append(f"Insufficient frontage ({frontage:.1f} m)")
    
    # 7. Slope constraints
    mean_gradient = slope_data.get("mean_gradient_percent", 0)
    if mean_gradient > settings.CDC_MAX_SLOPE_PERCENT:
        blocking_constraints.append(f"Slope too steep for CDC ({mean_gradient:.1f}%)")
    
    # 8. Stormwater to street (simplified check)
    falls_to_street = slope_data.get("falls_to_street", True)
    if not falls_to_street:
        # In some cases, stormwater not falling to street can complicate CDC
        # This is a simplified check
        pass
    
    # Determine if CDC is potentially compliant
    is_potentially_cdc_compliant = len(blocking_constraints) == 0
    
    likely_pathway = "CDC Possible" if is_potentially_cdc_compliant else "DA Only"
    
    return {
        "is_potentially_cdc_compliant": is_potentially_cdc_compliant,
        "likely_pathway": likely_pathway,
        "blocking_constraints": blocking_constraints
    }
