"""
Database Connection and Session Management

This module handles all Supabase PostgreSQL connections.
It provides a centralized way to interact with the database.

Engineering Notes:
- Uses Supabase Python client for PostgreSQL access
- Service role key used for admin operations (backend-only)
- Never expose service key to frontend
- All database operations are logged for debugging
"""

from supabase import create_client, Client
from config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    """
    Singleton database connection manager.
    Provides both admin (service role) and user-level access.
    """
    
    def __init__(self):
        """Initialize Supabase clients with service and anon keys."""
        try:
            # Service role client - has full admin access, bypasses RLS
            self.admin_client: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_key
            )
            
            # Anon client - respects RLS, used for user-level operations
            self.anon_client: Client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            
            logger.info("✅ Database clients initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {e}")
            raise
    
    def get_admin_client(self) -> Client:
        """Get service role client for admin operations."""
        return self.admin_client
    
    def get_user_client(self, access_token: str = None) -> Client:
        """
        Get user-scoped client with RLS enforcement.
        
        Args:
            access_token: Optional Supabase user access token for RLS context
        """
        if access_token:
            # Create a new client with user's access token for RLS
            client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            client.auth.set_session(access_token, None)
            return client
        return self.anon_client


# Global database instance
db = Database()
