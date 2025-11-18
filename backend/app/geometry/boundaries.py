"""
Boundary identification module.

Identifies front, rear, and side boundaries of a parcel.
"""

import math
from typing import Dict, List, Tuple, Optional
from shapely.geometry import Polygon, LineString, Point
import numpy as np


def compute_bearing(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Compute bearing from p1 to p2 in degrees (0-360, clockwise from north).
    
    Args:
        p1: Start point (x, y)
        p2: End point (x, y)
    
    Returns:
        Bearing in degrees
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    
    # atan2 gives angle from east, counterclockwise
    angle_rad = math.atan2(dx, dy)
    
    # Convert to degrees and normalize to 0-360
    bearing = math.degrees(angle_rad)
    if bearing < 0:
        bearing += 360
    
    return bearing


def identify_boundaries(
    polygon: Polygon,
    road_geometry: Optional[Polygon] = None
) -> Dict:
    """
    Identify front, rear, and side boundaries of a parcel.
    
    This is a simplified implementation that assumes the southern boundary
    is the front (typical for northern hemisphere lots facing north).
    
    In production, this should use road geometry intersection to determine
    the actual front boundary.
    
    Args:
        polygon: Shapely Polygon representing the parcel
        road_geometry: Optional road polygon/buffer for intersection testing
    
    Returns:
        Dictionary with boundary information
    """
    # Extract exterior coordinates
    coords = list(polygon.exterior.coords)
    
    # Create segments
    segments = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        length = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
        bearing = compute_bearing(p1, p2)
        midpoint = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
        
        segments.append({
            "start": p1,
            "end": p2,
            "length": length,
            "bearing": bearing,
            "midpoint": midpoint
        })
    
    # Simplified logic: find southernmost segment as front
    # In production, use road intersection
    southernmost_idx = min(range(len(segments)), 
                          key=lambda i: segments[i]["midpoint"][1])
    
    front_segment = segments[southernmost_idx]
    
    # Find opposite segment as rear (bearing ± 180°)
    target_bearing = (front_segment["bearing"] + 180) % 360
    
    rear_idx = None
    min_bearing_diff = float('inf')
    for i, seg in enumerate(segments):
        if i == southernmost_idx:
            continue
        bearing_diff = min(
            abs(seg["bearing"] - target_bearing),
            abs(seg["bearing"] - target_bearing + 360),
            abs(seg["bearing"] - target_bearing - 360)
        )
        if bearing_diff < min_bearing_diff:
            min_bearing_diff = bearing_diff
            rear_idx = i
    
    rear_segment = segments[rear_idx] if rear_idx is not None else front_segment
    
    # Identify side segments (remaining segments)
    side_indices = [i for i in range(len(segments)) 
                   if i not in [southernmost_idx, rear_idx]]
    
    # Split sides into left and right based on x-coordinate
    left_segments = []
    right_segments = []
    
    front_mid_x = front_segment["midpoint"][0]
    
    for idx in side_indices:
        seg = segments[idx]
        if seg["midpoint"][0] < front_mid_x:
            left_segments.append(seg)
        else:
            right_segments.append(seg)
    
    # Calculate total side lengths
    left_length = sum(seg["length"] for seg in left_segments) if left_segments else 0
    right_length = sum(seg["length"] for seg in right_segments) if right_segments else 0
    
    # Calculate average side orientations
    left_orientation = (
        np.mean([seg["bearing"] for seg in left_segments]) 
        if left_segments else 0
    )
    right_orientation = (
        np.mean([seg["bearing"] for seg in right_segments]) 
        if right_segments else 0
    )
    
    # Calculate depth as mean of side lengths
    depth_m = np.mean([left_length, right_length]) if (left_length or right_length) else 0
    
    # Calculate total perimeter
    perimeter_m = sum(seg["length"] for seg in segments)
    
    return {
        "front": {
            "length_m": round(front_segment["length"], 1),
            "orientation_deg": round(front_segment["bearing"], 0),
            "num_segments": 1
        },
        "rear": {
            "length_m": round(rear_segment["length"], 1),
            "orientation_deg": round(rear_segment["bearing"], 0),
            "num_segments": 1
        },
        "sides": [
            {
                "name": "left",
                "length_m": round(left_length, 1),
                "orientation_deg": round(left_orientation, 0)
            },
            {
                "name": "right",
                "length_m": round(right_length, 1),
                "orientation_deg": round(right_orientation, 0)
            }
        ],
        "perimeter_m": round(perimeter_m, 1),
        "frontage_m": round(front_segment["length"], 1),
        "depth_m": round(depth_m, 1)
    }


def detect_corner_lot(polygon: Polygon, road_geometries: List[Polygon]) -> bool:
    """
    Detect if parcel is a corner lot (adjacent to 2+ roads).
    
    Args:
        polygon: Parcel polygon
        road_geometries: List of road polygons
    
    Returns:
        True if corner lot, False otherwise
    """
    if not road_geometries:
        return False
    
    # Count how many distinct roads the parcel intersects
    intersecting_roads = 0
    for road in road_geometries:
        if polygon.intersects(road):
            intersecting_roads += 1
    
    return intersecting_roads >= 2
