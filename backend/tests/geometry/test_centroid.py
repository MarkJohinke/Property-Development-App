"""Tests for centroid calculation."""

import pytest
from shapely.geometry import Polygon
from backend.app.geometry.centroid import compute_centroid


def test_compute_centroid_square():
    """Test centroid calculation for a square."""
    # Simple square at origin
    square = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    centroid = compute_centroid(square, analysis_crs="EPSG:7856")
    
    # Centroid should have lat and lon keys
    assert "lat" in centroid
    assert "lon" in centroid
    assert isinstance(centroid["lat"], (int, float))
    assert isinstance(centroid["lon"], (int, float))


def test_compute_centroid_realistic_coordinates():
    """Test centroid with realistic MGA Zone 56 coordinates."""
    # Realistic coordinates for Northern Beaches area
    poly = Polygon([
        (360400, 6259000),
        (360415, 6259000),
        (360415, 6258960),
        (360400, 6258960)
    ])
    centroid = compute_centroid(poly, analysis_crs="EPSG:7856")
    
    # Should be in Sydney area (approximately -33.8°, 151.2°)
    assert -34.0 < centroid["lat"] < -33.5
    assert 151.0 < centroid["lon"] < 151.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
