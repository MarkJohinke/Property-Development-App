"""
DA (Development Application) pathway guidance.
"""

from typing import Dict, Any, List


def evaluate_da_potential(
    parcel_data: Dict[str, Any],
    geometry_data: Dict[str, Any],
    constraints: Dict[str, Any],
    slope_data: Dict[str, Any],
    recommended_studies: List[str]
) -> Dict[str, Any]:
    """
    Evaluate DA pathway and identify key issues.
    
    DA is more flexible than CDC but still requires consideration of
    planning impacts and design quality.
    
    Args:
        parcel_data: Parcel information
        geometry_data: Geometric properties
        constraints: Constraint evaluation results
        slope_data: Slope metrics
        recommended_studies: List of required specialist reports
    
    Returns:
        Dictionary with DA potential assessment
    """
    key_issues = []
    
    # 1. Bushfire considerations
    if constraints.get("bushfire_prone"):
        key_issues.append("Bushfire vegetation setback")
    
    # 2. Flood considerations
    if constraints.get("flood_prone"):
        key_issues.append("Flood planning and stormwater management")
    
    # 3. Heritage considerations
    if constraints.get("heritage_item"):
        key_issues.append("Heritage significance - strict controls apply")
    elif constraints.get("heritage_conservation_area"):
        key_issues.append("Heritage conservation area - streetscape compatibility")
    
    # 4. Slope and geotechnical
    mean_gradient = slope_data.get("mean_gradient_percent", 0)
    if mean_gradient > 15:
        key_issues.append("Slope and stormwater")
    
    geotech_risk = constraints.get("geotech_landslip_risk", "Low")
    if geotech_risk in ["High", "Very High"]:
        key_issues.append("Geotechnical stability")
    
    # 5. Lot regularity and streetscape
    regularity = geometry_data.get("regularity_index", 1.0)
    if regularity < 0.75:
        key_issues.append("Irregular lot shape - design challenges")
    
    # 6. Bulk and scale (simplified check)
    # In production, would consider neighbouring development
    key_issues.append("Streetscape bulk & scale")
    
    # 7. Corner lot considerations
    if geometry_data.get("is_corner_lot"):
        key_issues.append("Corner lot - secondary street setbacks")
    
    # Determine if DA is likely supportable
    # Heritage items and very high constraints make DA challenging
    is_likely_supportable = True
    
    if constraints.get("heritage_item"):
        is_likely_supportable = False  # Heritage items are very difficult
    
    if geotech_risk == "Very High":
        is_likely_supportable = False
    
    # Red flag conditions
    red_flags = []
    if constraints.get("heritage_item"):
        red_flags.append("Heritage Item")
    if geotech_risk == "Very High":
        red_flags.append("Very High Landslip Risk")
    
    # Remove duplicates from key issues
    key_issues = list(dict.fromkeys(key_issues))
    
    return {
        "is_likely_supportable": is_likely_supportable,
        "key_issues": key_issues[:5],  # Limit to top 5 issues
        "recommended_studies": recommended_studies,
        "red_flags": red_flags
    }
