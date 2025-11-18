"""
Slope and fall direction calculation module.

Computes slope metrics from DEM data.
"""

import math
from typing import Dict, Optional, List, Tuple
from shapely.geometry import Polygon
import numpy as np


def compute_slope_metrics(
    polygon: Polygon,
    dem_data: Optional[np.ndarray] = None,
    front_orientation_deg: Optional[float] = None
) -> Dict:
    """
    Compute slope metrics for a parcel from DEM data.
    
    This is a simplified implementation. In production, this would:
    1. Sample a regular grid of points inside the parcel
    2. Query elevation from DEM raster at each point
    3. Compute gradients using finite differences
    4. Calculate mean/max gradient and primary fall direction
    
    Args:
        polygon: Shapely Polygon representing the parcel
        dem_data: Optional DEM elevation data (not yet implemented)
        front_orientation_deg: Front boundary orientation for falls_to_street calc
    
    Returns:
        Dictionary with slope metrics
    """
    # Simplified implementation with mock data
    # In production, implement actual DEM sampling and gradient calculation
    
    if dem_data is None:
        # Return mock data for now
        # TODO: Implement actual DEM sampling
        mean_gradient = 6.5
        max_gradient = 12.0
        primary_fall_direction = 180.0  # South
    else:
        # Placeholder for actual DEM processing
        mean_gradient = 5.0
        max_gradient = 10.0
        primary_fall_direction = 180.0
    
    # Determine if slope falls to street
    falls_to_street = False
    if front_orientation_deg is not None:
        # Calculate street direction (perpendicular to front)
        street_direction = (front_orientation_deg + 90) % 360
        
        # Check if fall direction is within ~45° of street direction
        angle_diff = min(
            abs(primary_fall_direction - street_direction),
            abs(primary_fall_direction - street_direction + 360),
            abs(primary_fall_direction - street_direction - 360)
        )
        
        falls_to_street = angle_diff <= 45
    
    return {
        "mean_gradient_percent": round(mean_gradient, 1),
        "max_gradient_percent": round(max_gradient, 1),
        "primary_fall_direction_deg": round(primary_fall_direction, 0),
        "falls_to_street": falls_to_street
    }


def sample_dem_grid(
    polygon: Polygon,
    grid_spacing_m: float = 5.0
) -> List[Tuple[float, float]]:
    """
    Generate a regular grid of sample points inside the parcel.
    
    Args:
        polygon: Parcel polygon
        grid_spacing_m: Spacing between grid points in metres
    
    Returns:
        List of (x, y) coordinates
    """
    bounds = polygon.bounds  # (minx, miny, maxx, maxy)
    minx, miny, maxx, maxy = bounds
    
    # Generate grid points
    x_coords = np.arange(minx, maxx, grid_spacing_m)
    y_coords = np.arange(miny, maxy, grid_spacing_m)
    
    points = []
    for x in x_coords:
        for y in y_coords:
            from shapely.geometry import Point
            point = Point(x, y)
            if polygon.contains(point):
                points.append((x, y))
    
    return points


def calculate_gradient(
    elevations: np.ndarray,
    dx: float,
    dy: float
) -> Tuple[float, float]:
    """
    Calculate gradient magnitude and aspect from elevation grid.
    
    Args:
        elevations: 2D array of elevations
        dx: Grid spacing in x direction
        dy: Grid spacing in y direction
    
    Returns:
        Tuple of (gradient_percent, aspect_deg)
    """
    # Use central differences for gradient calculation
    # dz/dx and dz/dy
    
    # This is a placeholder for actual gradient calculation
    # In production, use numpy gradient functions
    
    gradient_percent = 5.0
    aspect_deg = 180.0
    
    return gradient_percent, aspect_deg


def circular_mean_angle(angles: List[float], weights: Optional[List[float]] = None) -> float:
    """
    Compute circular mean of angles (in degrees).
    
    Args:
        angles: List of angles in degrees
        weights: Optional weights for each angle
    
    Returns:
        Mean angle in degrees (0-360)
    """
    if not angles:
        return 0.0
    
    if weights is None:
        weights = [1.0] * len(angles)
    
    # Convert to radians
    angles_rad = [math.radians(a) for a in angles]
    
    # Compute weighted circular mean
    sin_sum = sum(w * math.sin(a) for a, w in zip(angles_rad, weights))
    cos_sum = sum(w * math.cos(a) for a, w in zip(angles_rad, weights))
    
    mean_rad = math.atan2(sin_sum, cos_sum)
    mean_deg = math.degrees(mean_rad)
    
    # Normalize to 0-360
    if mean_deg < 0:
        mean_deg += 360
    
    return round(mean_deg, 1)
