"""
Tests for planning API endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_land_zoning():
    """Test land zoning endpoint with Northern Beaches coordinates."""
    # Dee Why coordinates
    response = client.get(
        "/api/planning/zoning",
        params={"latitude": -33.7525, "longitude": 151.2837}
    )
    
    # May return 404 if ArcGIS service is unavailable
    assert response.status_code in [200, 404]
    
    if response.status_code == 200:
        data = response.json()
        assert "label" in data or "className" in data


def test_get_planning_controls():
    """Test planning controls endpoint."""
    response = client.get(
        "/api/planning/controls",
        params={"latitude": -33.7525, "longitude": 151.2837}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "source" in data
    # Currently returns placeholder data
    assert data["fsr"] is None
    assert data["height"] is None
    assert data["note"] is not None


def test_get_lec_findings_default():
    """Test LEC findings endpoint with default parameters."""
    response = client.get(
        "/api/planning/lec-findings",
        params={"latitude": -33.7525, "longitude": 151.2837}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "totalCases" in data
    assert "findings" in data
    assert "searchRadius" in data
    assert "5.0km" in data["searchRadius"]
    assert isinstance(data["findings"], list)


def test_get_lec_findings_custom_radius():
    """Test LEC findings with custom radius."""
    response = client.get(
        "/api/planning/lec-findings",
        params={
            "latitude": -33.7525,
            "longitude": 151.2837,
            "radius_km": 10.0,
            "years_back": 3
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "10.0km" in data["searchRadius"]


def test_get_lec_findings_invalid_radius():
    """Test LEC findings with invalid radius."""
    response = client.get(
        "/api/planning/lec-findings",
        params={
            "latitude": -33.7525,
            "longitude": 151.2837,
            "radius_km": 50.0  # Exceeds max of 20.0
        }
    )
    
    assert response.status_code == 422  # Validation error


def test_missing_coordinates():
    """Test endpoints with missing coordinates."""
    response = client.get("/api/planning/zoning")
    assert response.status_code == 422  # Missing required parameters
    
    response = client.get("/api/planning/controls")
    assert response.status_code == 422


def test_lec_finding_structure():
    """Test that LEC findings have the expected structure."""
    response = client.get(
        "/api/planning/lec-findings",
        params={"latitude": -33.7525, "longitude": 151.2837}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    if len(data["findings"]) > 0:
        finding = data["findings"][0]
        assert "caseNumber" in finding
        assert "decisionDate" in finding
        assert "address" in finding
        assert "distanceKm" in finding
        assert "clause46Details" in finding
        assert "links" in finding
        assert "decision" in finding["links"]
        assert "clause46" in finding["links"]
