"""
Constraints engine for evaluating planning constraints and overlays.
"""

from typing import Dict, Any, List
from shapely.geometry import Polygon


def evaluate_constraints(
    parcel_geometry: Polygon,
    geometry_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate planning constraints for a parcel.
    
    This is a simplified implementation that returns mock constraint data.
    In production, this would:
    1. Query NSW spatial datasets (bushfire, flood, heritage, etc.)
    2. Perform spatial intersections with constraint layers
    3. Determine constraint severity and classes
    4. Aggregate into overall risk scoring
    
    Args:
        parcel_geometry: Shapely Polygon of the parcel
        geometry_data: Computed geometry data (for context)
    
    Returns:
        Dictionary with constraint evaluation results
    """
    # Simplified mock implementation
    # TODO: Implement actual spatial queries to NSW datasets
    
    constraints = {
        "bushfire_prone": False,
        "bushfire_category": None,
        "flood_prone": False,
        "flood_notes": None,
        "acid_sulfate_soil_class": "None",
        "heritage_item": False,
        "heritage_conservation_area": False,
        "foreshore_building_line": False,
        "riparian_buffer": False,
        "biodiversity": False,
        "geotech_landslip_risk": "Low",
        "other_overlays": []
    }
    
    return constraints


def compute_constraint_severity(constraints: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute severity scores for constraints.
    
    Args:
        constraints: Dictionary of constraint flags and values
    
    Returns:
        Dictionary with severity scores
    """
    from backend.app.config.settings import get_settings
    settings = get_settings()
    
    # Severity scoring (0-3 scale)
    bushfire_severity = 0
    if constraints.get("bushfire_prone"):
        category = constraints.get("bushfire_category", "")
        if "Category 1" in category or "Vegetation Category 1" in category:
            bushfire_severity = 3
        elif "Category 2" in category:
            bushfire_severity = 2
        else:
            bushfire_severity = 1
    
    flood_severity = 3 if constraints.get("flood_prone") else 0
    
    heritage_severity = 0
    if constraints.get("heritage_item"):
        heritage_severity = 3
    elif constraints.get("heritage_conservation_area"):
        heritage_severity = 2
    
    geotech_severity = {
        "Very High": 3,
        "High": 2,
        "Moderate": 1,
        "Low": 0
    }.get(constraints.get("geotech_landslip_risk", "Low"), 0)
    
    biodiversity_severity = 2 if constraints.get("biodiversity") else 0
    
    misc_severity = len(constraints.get("other_overlays", []))
    
    # Weighted score
    total_score = (
        settings.BUSHFIRE_WEIGHT * bushfire_severity +
        settings.FLOOD_WEIGHT * flood_severity +
        settings.HERITAGE_WEIGHT * heritage_severity +
        settings.GEOTECH_WEIGHT * geotech_severity +
        settings.BIODIVERSITY_WEIGHT * biodiversity_severity +
        settings.MISC_WEIGHT * misc_severity
    )
    
    # Overall rating
    if total_score == 0:
        rating = "None"
    elif total_score <= 3:
        rating = "Low"
    elif total_score <= 7:
        rating = "Medium"
    elif total_score <= 12:
        rating = "High"
    else:
        rating = "Red-Flag"
    
    return {
        "bushfire_severity": bushfire_severity,
        "flood_severity": flood_severity,
        "heritage_severity": heritage_severity,
        "geotech_severity": geotech_severity,
        "biodiversity_severity": biodiversity_severity,
        "total_score": total_score,
        "rating": rating
    }


def recommend_required_studies(constraints: Dict[str, Any]) -> List[str]:
    """
    Recommend required specialist reports based on constraints.
    
    Args:
        constraints: Dictionary of constraint flags and values
    
    Returns:
        List of required study names
    """
    studies = []
    
    if constraints.get("bushfire_prone"):
        studies.append("Bushfire Assessment Report")
        studies.append("BAL Certificate")
    
    if constraints.get("flood_prone"):
        studies.append("Flood Study")
        studies.append("Flood Impact Assessment")
    
    geotech_risk = constraints.get("geotech_landslip_risk", "Low")
    if geotech_risk in ["High", "Very High", "Moderate"]:
        studies.append("Geotechnical Report")
        if geotech_risk in ["High", "Very High"]:
            studies.append("Slope Stability Assessment")
    
    if constraints.get("biodiversity"):
        studies.append("Biodiversity Assessment")
        studies.append("Flora and Fauna Report")
    
    if constraints.get("foreshore_building_line"):
        studies.append("Coastal Hazard Assessment")
        studies.append("Foreshore Setback Report")
    
    if constraints.get("heritage_item") or constraints.get("heritage_conservation_area"):
        studies.append("Heritage Impact Statement")
    
    # Assume tree constraints require arborist report (would check tree layers in production)
    # studies.append("Arborist Report")
    
    return studies
