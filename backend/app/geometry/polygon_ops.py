"""
Polygon operations module.

Computes area, perimeter, and regularity index for parcels.
"""

import math
from typing import Dict, Tuple
from shapely.geometry import Polygon


def compute_area_perimeter(polygon: Polygon) -> Tuple[float, float]:
    """
    Compute area and perimeter of polygon in analysis CRS.
    
    Args:
        polygon: Shapely Polygon in projected CRS (metres)
    
    Returns:
        Tuple of (area_sqm, perimeter_m)
    
    Example:
        >>> from shapely.geometry import Polygon
        >>> poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        >>> area, perimeter = compute_area_perimeter(poly)
        >>> area
        100.0
        >>> perimeter
        40.0
    """
    area_sqm = polygon.area
    perimeter_m = polygon.length
    
    return round(area_sqm, 2), round(perimeter_m, 2)


def compute_regularity_index(polygon: Polygon) -> float:
    """
    Compute regularity index (0-1) for a polygon.
    
    A perfect rectangle/square has regularity = 1.0
    Irregular shapes have lower values.
    
    Formula:
        regularity = (4 * sqrt(area)) / perimeter
        clamped to [0, 1]
    
    Args:
        polygon: Shapely Polygon in projected CRS
    
    Returns:
        Regularity index between 0 and 1
    
    Example:
        >>> from shapely.geometry import Polygon
        >>> # Perfect square
        >>> square = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        >>> regularity = compute_regularity_index(square)
        >>> abs(regularity - 1.0) < 0.01
        True
    """
    area = polygon.area
    perimeter = polygon.length
    
    if perimeter == 0:
        return 0.0
    
    # For a given area, the minimum perimeter is achieved by a square
    # P_min = 4 * sqrt(A)
    p_min = 4 * math.sqrt(area)
    
    # Regularity = P_min / P_actual
    regularity_raw = p_min / perimeter
    
    # Clamp to [0, 1]
    regularity = max(0.0, min(1.0, regularity_raw))
    
    return round(regularity, 3)


def get_regularity_description(regularity: float) -> str:
    """
    Get human-readable description of regularity.
    
    Args:
        regularity: Regularity index (0-1)
    
    Returns:
        Description string
    """
    if regularity >= 0.9:
        return "regular lot"
    elif regularity >= 0.7:
        return "mildly irregular"
    else:
        return "irregular lot"
