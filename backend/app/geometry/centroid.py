"""
Centroid calculation module.

Computes the centroid of a polygon in analysis CRS and returns it in WGS84.
"""

from typing import Dict
from shapely.geometry import Polygon
from pyproj import Transformer


def compute_centroid(polygon: Polygon, analysis_crs: str = "EPSG:7856") -> Dict[str, float]:
    """
    Compute centroid of polygon in analysis CRS and reproject to WGS84.
    
    Args:
        polygon: Shapely Polygon in analysis CRS (e.g., EPSG:7856)
        analysis_crs: The CRS of the input polygon (default: EPSG:7856)
    
    Returns:
        Dictionary with 'lat' and 'lon' keys in WGS84
    
    Example:
        >>> from shapely.geometry import Polygon
        >>> poly = Polygon([(360400, 6259000), (360415, 6259000), 
        ...                 (360415, 6258960), (360400, 6258960)])
        >>> centroid = compute_centroid(poly)
        >>> 'lat' in centroid and 'lon' in centroid
        True
    """
    # Compute centroid in analysis CRS
    centroid_point = polygon.centroid
    
    # Create transformer from analysis CRS to WGS84
    transformer = Transformer.from_crs(analysis_crs, "EPSG:4326", always_xy=True)
    
    # Transform to WGS84 (lon, lat order)
    lon, lat = transformer.transform(centroid_point.x, centroid_point.y)
    
    return {
        "lat": round(lat, 6),
        "lon": round(lon, 6)
    }
