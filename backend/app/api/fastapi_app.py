"""FastAPI application for NSW Property Intelligence Engine."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.app.pipeline.runner import analyse_parcel
from backend.app.api.schemas import ParcelInput, ParcelAnalysisResponse

app = FastAPI(
    title="NSW Property Intelligence Engine",
    version="1.0.0",
    description="Analyse NSW properties for development potential, constraints, and planning pathways"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "NSW Property Intelligence Engine",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/analyse_parcel", response_model=ParcelAnalysisResponse)
async def analyse_parcel_endpoint(input_data: ParcelInput):
    """
    Analyse a parcel and return complete property intelligence.
    
    Takes an address, lot/DP, or coordinates and returns:
    - Geometry (frontage, depth, regularity, slope)
    - Constraints (bushfire, flood, heritage, etc.)
    - Planning controls (LEP, SEPP, zoning)
    - Development metrics (yield, envelope)
    - Feasibility (CDC/DA pathways, risk rating)
    """
    try:
        result = analyse_parcel(input_data.model_dump())
        return ParcelAnalysisResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
