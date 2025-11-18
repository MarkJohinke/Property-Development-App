"""
NSW Planning data service - pulls data from ArcGIS and NSW Planning Portal.
"""
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

import httpx


class NSWPlanningService:
    """Service for fetching NSW planning data from official sources."""
    
    def __init__(self):
        self.land_zoning_endpoint = (
            "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/"
            "ePlanning/Planning_Portal_Principal_Planning/MapServer/19/query"
        )
        self.timeout = httpx.Timeout(10.0, connect=5.0)
    
    async def fetch_land_zoning(
        self, 
        latitude: float, 
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch land zoning information for a given coordinate.
        
        Returns zoning label, FSR, height, and other planning controls.
        """
        params = {
            "f": "json",
            "geometry": f"{longitude},{latitude}",
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "LABEL,LAY_CLASS,EPI_NAME,COMMENCED_DATE",
            "returnGeometry": "false"
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.land_zoning_endpoint,
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                features = data.get("features", [])
                if not features:
                    return None
                
                attributes = features[0].get("attributes", {})
                return {
                    "label": attributes.get("LABEL"),
                    "className": attributes.get("LAY_CLASS"),
                    "epiName": attributes.get("EPI_NAME"),
                    "commencedDate": attributes.get("COMMENCED_DATE")
                }
        except (httpx.HTTPError, KeyError, IndexError):
            return None
    
    async def fetch_planning_controls(
        self,
        latitude: float,
        longitude: float,
        epi_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch FSR, height, and lot size controls from LEP mapping.
        
        TODO: Implement actual API calls to NSW Planning Portal.
        For now, returns structure that should be populated from real sources.
        """
        # This would call multiple ArcGIS endpoints for:
        # - FSR (Floor Space Ratio) mapping layer
        # - HOB (Height of Buildings) mapping layer  
        # - Lot size mapping layer
        
        # Placeholder - actual implementation needs:
        # 1. LEP/DCP service endpoints discovery
        # 2. Layer ID identification per council
        # 3. Geometry intersection queries
        
        return {
            "fsr": None,  # e.g., "0.5:1"
            "height": None,  # e.g., "8.5 metres"
            "minLotSize": None,  # e.g., "600 square metres"
            "source": "NSW Planning Portal - LEP Maps",
            "note": "Planning controls require council-specific LEP layer queries"
        }


class LECService:
    """
    Service for fetching Land and Environmental Court (LEC) decisions.
    """
    
    def __init__(self):
        # NSW Caselaw API endpoint
        self.caselaw_api = "https://api.caselaw.nsw.gov.au"
        self.timeout = httpx.Timeout(15.0, connect=5.0)
    
    async def search_lec_findings(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        years_back: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Search for LEC findings within radius and timeframe.
        
        Args:
            latitude: Site latitude
            longitude: Site longitude
            radius_km: Search radius in kilometers (default 5km)
            years_back: How many years to look back (default 2)
            
        Returns:
            List of LEC decisions with Clause 4.6 variations
        """
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years_back * 365)
        
        # TODO: Implement actual LEC/Caselaw API integration
        # The NSW Caselaw website provides access to LEC decisions
        # We need to:
        # 1. Search for LEC decisions in date range
        # 2. Filter by location/address proximity
        # 3. Identify Clause 4.6 variation decisions
        # 4. Extract decision details, addresses, outcomes
        
        # Placeholder response structure
        return [
            {
                "caseNumber": "2024/NSWLEC/123",
                "decisionDate": "2024-03-15",
                "address": "123 Example Street, Suburb NSW 2099",
                "distanceKm": 2.3,
                "applicant": "Example Developer Pty Ltd",
                "summary": "Clause 4.6 variation to height of buildings control",
                "outcome": "Approved",
                "heightVariation": "10% variation to 8.5m height limit granted",
                "fsrVariation": None,
                "clause46Details": {
                    "clauseReference": "Clause 4.6",
                    "controlVaried": "Height of Buildings",
                    "variationRequested": "10%",
                    "justification": (
                        "Development achieves better urban design outcomes "
                        "through additional height on sloping site"
                    )
                },
                "links": {
                    "decision": "https://www.caselaw.nsw.gov.au/decision/...",
                    "clause46": (
                        "https://legislation.nsw.gov.au/view/html/inforce/"
                        "current/epi-2011-0293#sec.4.6"
                    )
                },
                "note": "Example LEC decision - actual API integration required"
            }
        ]
    
    async def get_clause_46_precedents(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0
    ) -> Dict[str, Any]:
        """
        Get summary of Clause 4.6 variation precedents in area.
        """
        findings = await self.search_lec_findings(
            latitude, 
            longitude, 
            radius_km
        )
        
        return {
            "totalCases": len(findings),
            "approvalRate": "75%",  # Calculate from actual data
            "commonVariations": [
                "Height of Buildings (60%)",
                "Floor Space Ratio (30%)",
                "Setbacks (10%)"
            ],
            "findings": findings,
            "searchRadius": f"{radius_km}km",
            "note": (
                "Clause 4.6 allows variation to development standards where "
                "compliance is unreasonable/unnecessary and proposal is in "
                "public interest"
            )
        }
