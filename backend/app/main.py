"""
FastAPI backend for Property Development Analysis Tool.

This backend provides API endpoints for property analysis, zoning information,
and planning data aggregation for NSW properties.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings

app = FastAPI(
    title="Property Development API",
    description="Backend API for NSW property development analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    version: str
    message: str


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - API information."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "message": "Property Development API - Backend is running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "message": "Backend service is operational"
    }


@app.get("/api/status")
async def api_status():
    """API status endpoint with configuration info."""
    return {
        "status": "operational",
        "environment": settings.environment,
        "geocode_user_agent": settings.geocode_user_agent,
        "cors_origins": settings.cors_origins
    }
