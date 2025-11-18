"""Pydantic schemas for API requests and responses."""

from pydantic import BaseModel, Field
from typing import Any, Dict


class ParcelInput(BaseModel):
    """Input schema for parcel analysis request."""
    
    input_type: str = Field(
        ...,
        description="Type of input: 'address', 'lot_plan', or 'coordinates'"
    )
    value: str = Field(
        ...,
        description="Input value (address string, lot/DP, or lat,lon)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "input_type": "address",
                "value": "3 Nield Avenue, Balgowlah NSW 2093"
            }
        }


class ParcelAnalysisResponse(BaseModel):
    """Response schema for parcel analysis."""
    
    result: Dict[str, Any] = Field(
        ...,
        description="Complete parcel analysis result"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "result": {
                    "input": {"query_type": "address", "raw_input": "3 Nield Avenue, Balgowlah NSW 2093"},
                    "parcel": {"lot_number": "2", "plan_number": "228402"},
                    "geometry": {"frontage_m": 15.0, "depth_m": 40.0},
                    "feasibility": {"overall_risk_rating": "Medium"}
                }
            }
        }
