"""
Configuration settings for NSW Property Intelligence Engine.
"""

from typing import Dict, Any
from dataclasses import dataclass, field


@dataclass
class Settings:
    """Configuration settings for the engine."""
    
    # Analysis CRS (GDA2020 / MGA Zone 56 for Sydney)
    ANALYSIS_CRS: str = "EPSG:7856"
    OUTPUT_CRS: str = "EPSG:4326"  # WGS84
    
    # Constraint weights for risk scoring
    BUSHFIRE_WEIGHT: int = 3
    FLOOD_WEIGHT: int = 3
    HERITAGE_WEIGHT: int = 4
    GEOTECH_WEIGHT: int = 2
    BIODIVERSITY_WEIGHT: int = 1
    MISC_WEIGHT: int = 1
    
    # CDC eligibility thresholds
    CDC_MAX_SLOPE_PERCENT: float = 20.0
    CDC_MAX_BAL: int = 40
    
    # Minimum lot requirements (typical for Northern Beaches)
    MIN_LOT_AREA_DUAL_OCC_SQM: float = 600.0
    MIN_FRONTAGE_DUAL_OCC_M: float = 15.0
    
    # FSR thresholds for typologies
    MIN_FSR_TERRACE: float = 0.7
    MIN_FSR_MULTI_DWELLING: float = 0.7
    
    # Default setbacks (m)
    DEFAULT_FRONT_SETBACK_M: float = 6.0
    DEFAULT_REAR_SETBACK_M: float = 6.0
    DEFAULT_SIDE_SETBACK_MIN_M: float = 0.9
    
    # Landscaping requirements (%)
    DEEP_SOIL_PERCENTAGE: float = 0.15  # 15%
    LANDSCAPED_AREA_PERCENTAGE: float = 0.30  # 30%
    
    # Typical unit sizes (sqm) for yield calculations
    AVERAGE_UNIT_SIZE_TOWNHOUSE_SQM: float = 100.0
    AVERAGE_UNIT_SIZE_APARTMENT_SQM: float = 70.0
    
    # Dataset URLs (mock for now)
    NSW_CADASTRE_URL: str = "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer"
    NSW_PLANNING_URL: str = "https://maps.six.nsw.gov.au/arcgis/rest/services/public/Planning/MapServer"
    
    # Engine metadata
    ENGINE_VERSION: str = "1.0.0"
    SOURCE_SYSTEM: str = "DevGPT-v1"


# Singleton instance
_settings: Settings = None


def get_settings() -> Settings:
    """Get settings singleton instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
