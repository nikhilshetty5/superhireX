"""
Configuration Management for SuperhireX Backend

This module loads and validates all environment variables.
It provides a centralized configuration object for the entire application.

Engineering Notes:
- Uses Pydantic Settings for type-safe configuration
- All secrets are loaded from environment variables
- Validation happens at startup to fail fast
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Pydantic validates types and required fields automatically.
    """
    
    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    
    # OpenAI Configuration (via Emergent LLM Key)
    openai_api_key: str
    openai_base_url: str = "https://api.emergent.ai/v1"
    
    # Application Settings
    environment: str = "development"
    backend_port: int = 8001
    frontend_url: str = "http://localhost:3000"
    admin_key: str = "admin-key-default"  # Change this in production!
    
    # File Upload Settings
    max_resume_size_mb: int = 10
    allowed_resume_types: str = ".pdf,.doc,.docx"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
