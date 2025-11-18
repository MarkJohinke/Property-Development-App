"""
Configuration management for the backend application.
"""
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    environment: str = "development"
    
    # CORS Configuration
    cors_origins: Union[str, List[str]] = ["http://localhost:3000"]
    
    # External Services
    geocode_user_agent: str = "property-dev-app/0.1 (+https://example.com)"
    nsw_planning_arcgis_url: str = (
        "https://maps.six.nsw.gov.au/arcgis/rest/services/public/"
        "Planning/MapServer/identify"
    )
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
