"""
Planning data API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.nsw_planning import NSWPlanningService, LECService

router = APIRouter(prefix="/api/planning", tags=["planning"])

nsw_planning = NSWPlanningService()
lec_service = LECService()


class ZoningResponse(BaseModel):
    """Land zoning information response."""
    label: Optional[str]
    className: Optional[str]
    epiName: Optional[str]
    commencedDate: Optional[int]


class PlanningControlsResponse(BaseModel):
    """Planning controls response."""
    fsr: Optional[str] = Field(description="Floor Space Ratio")
    height: Optional[str] = Field(description="Height of Buildings")
    minLotSize: Optional[str] = Field(description="Minimum Lot Size")
    source: str
    note: Optional[str] = None


class LECFinding(BaseModel):
    """Land and Environmental Court finding."""
    caseNumber: str
    decisionDate: str
    address: str
    distanceKm: float
    applicant: str
    summary: str
    outcome: str
    heightVariation: Optional[str] = None
    fsrVariation: Optional[str] = None
    clause46Details: dict
    links: dict
    note: Optional[str] = None


class LECPrecedentsResponse(BaseModel):
    """LEC Clause 4.6 precedents response."""
    totalCases: int
    approvalRate: str
    commonVariations: list[str]
    findings: list[LECFinding]
    searchRadius: str
    note: str


@router.get("/zoning", response_model=ZoningResponse)
async def get_land_zoning(
    latitude: float = Query(..., description="Site latitude"),
    longitude: float = Query(..., description="Site longitude")
):
    """
    Get land zoning information for a location.
    """
    zoning = await nsw_planning.fetch_land_zoning(latitude, longitude)
    
    if not zoning:
        raise HTTPException(
            status_code=404,
            detail="No zoning information found for this location"
        )
    
    return zoning


@router.get("/controls", response_model=PlanningControlsResponse)
async def get_planning_controls(
    latitude: float = Query(..., description="Site latitude"),
    longitude: float = Query(..., description="Site longitude"),
    epi_name: Optional[str] = Query(None, description="LEP/EPI name")
):
    """
    Get planning controls (FSR, height, lot size) for a location.
    
    Note: This endpoint currently returns placeholder data.
    Full implementation requires council-specific LEP layer queries.
    """
    controls = await nsw_planning.fetch_planning_controls(
        latitude, 
        longitude, 
        epi_name
    )
    
    return controls


@router.get("/lec-findings", response_model=LECPrecedentsResponse)
async def get_lec_findings(
    latitude: float = Query(..., description="Site latitude"),
    longitude: float = Query(..., description="Site longitude"),
    radius_km: float = Query(
        5.0, 
        description="Search radius in kilometers",
        ge=0.1,
        le=20.0
    ),
    years_back: int = Query(
        2,
        description="How many years to look back",
        ge=1,
        le=10
    )
):
    """
    Get Land & Environmental Court findings within radius and timeframe.
    
    Includes Clause 4.6 variation decisions with links to findings and
    the Clause 4.6 provision.
    
    Note: This endpoint currently returns example data.
    Full implementation requires NSW Caselaw API integration.
    """
    precedents = await lec_service.get_clause_46_precedents(
        latitude, 
        longitude, 
        radius_km
    )
    
    return precedents
