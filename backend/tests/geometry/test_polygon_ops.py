"""Tests for polygon operations (area, perimeter, regularity)."""

import pytest
from shapely.geometry import Polygon
from backend.app.geometry.polygon_ops import (
    compute_area_perimeter,
    compute_regularity_index,
    get_regularity_description
)


def test_compute_area_perimeter_square():
    """Test area and perimeter calculation for a perfect square."""
    # 10m x 10m square
    square = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    area, perimeter = compute_area_perimeter(square)
    
    assert area == 100.0
    assert perimeter == 40.0


def test_compute_area_perimeter_rectangle():
    """Test area and perimeter for a rectangle."""
    # 15m x 40m rectangle (typical lot dimensions)
    rect = Polygon([(0, 0), (15, 0), (15, 40), (0, 40)])
    area, perimeter = compute_area_perimeter(rect)
    
    assert area == 600.0
    assert perimeter == 110.0


def test_regularity_index_perfect_square():
    """Test regularity index for a perfect square."""
    square = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    regularity = compute_regularity_index(square)
    
    # Perfect square should have regularity very close to 1.0
    assert regularity >= 0.99
    assert regularity <= 1.0


def test_regularity_index_rectangle():
    """Test regularity index for a rectangle."""
    # 15m x 40m rectangle
    rect = Polygon([(0, 0), (15, 0), (15, 40), (0, 40)])
    regularity = compute_regularity_index(rect)
    
    # Rectangle should have good regularity (> 0.9)
    assert 0.85 <= regularity <= 1.0


def test_regularity_index_irregular():
    """Test regularity index for an irregular polygon."""
    # Irregular L-shaped polygon
    irregular = Polygon([
        (0, 0), (10, 0), (10, 5),
        (5, 5), (5, 10), (0, 10)
    ])
    regularity = compute_regularity_index(irregular)
    
    # Irregular shape should have lower regularity
    assert 0.0 <= regularity < 0.9


def test_get_regularity_description():
    """Test regularity description generation."""
    assert get_regularity_description(0.95) == "regular lot"
    assert get_regularity_description(0.85) == "mildly irregular"
    assert get_regularity_description(0.65) == "irregular lot"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
