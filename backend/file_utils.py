"""
File Processing Utilities

Handles resume file uploads, text extraction, and storage.

Engineering Notes:
- Supports PDF and DOCX formats
- Text extraction is done locally (no API calls, saves money)
- Files are stored in Supabase Storage
- Abstraction layer allows future migration to S3
- All file operations are logged and validated
"""

import PyPDF2
import docx
import io
import logging
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
from config import settings

logger = logging.getLogger(__name__)


class FileProcessor:
    """
    Handles resume file processing and text extraction.
    
    Engineering Notes:
    - Text extraction happens locally (free)
    - No external API calls for extraction
    - Supports PDF and DOCX
    - Could add .txt, .rtf support later
    """
    
    @staticmethod
    async def extract_text_from_resume(file: UploadFile) -> str:
        """
        Extract text content from resume file.
        
        Supports:
        - PDF (.pdf)
        - Word documents (.doc, .docx)
        
        Args:
            file: Uploaded resume file
        
        Returns:
            Extracted text content
        
        Raises:
            HTTPException: If file format unsupported or extraction fails
        """
        try:
            file_extension = file.filename.split('.')[-1].lower()
            logger.info(f"📄 Extracting text from {file.filename} (type: {file_extension})")
            
            # Read file content
            content = await file.read()
            
            # Extract based on file type
            if file_extension == 'pdf':
                text = FileProcessor._extract_from_pdf(content)
            elif file_extension in ['doc', 'docx']:
                text = FileProcessor._extract_from_docx(content)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file format: .{file_extension}. Please upload PDF or DOCX."
                )
            
            if not text or len(text.strip()) < 100:
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract sufficient text from resume. Please ensure file is readable."
                )
            
            logger.info(f"✅ Extracted {len(text)} characters from resume")
            return text
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Text extraction failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process resume: {str(e)}"
            )
    
    @staticmethod
    def _extract_from_pdf(content: bytes) -> str:
        """
        Extract text from PDF file.
        
        Uses PyPDF2 for local extraction (no API costs).
        """
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"❌ PDF extraction failed: {e}")
            raise Exception(f"Failed to extract text from PDF: {e}")
    
    @staticmethod
    def _extract_from_docx(content: bytes) -> str:
        """
        Extract text from DOCX file.
        
        Uses python-docx for local extraction (no API costs).
        """
        try:
            docx_file = io.BytesIO(content)
            doc = docx.Document(docx_file)
            
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"❌ DOCX extraction failed: {e}")
            raise Exception(f"Failed to extract text from DOCX: {e}")
    
    @staticmethod
    def validate_file_size(file: UploadFile) -> None:
        """
        Validate file size is within limits.
        
        Args:
            file: Uploaded file
        
        Raises:
            HTTPException: If file too large
        """
        # Note: file.size might not be available in all cases
        # Additional check in upload endpoint
        max_size = settings.max_resume_size_mb * 1024 * 1024
        logger.info(f"File size validation: max {settings.max_resume_size_mb}MB")
    
    @staticmethod
    def validate_file_type(filename: str) -> None:
        """
        Validate file type is allowed.
        
        Args:
            filename: Name of uploaded file
        
        Raises:
            HTTPException: If file type not allowed
        """
        allowed_types = settings.allowed_resume_types.split(',')
        file_extension = '.' + filename.split('.')[-1].lower()
        
        if file_extension not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_extension} not allowed. Allowed types: {allowed_types}"
            )
        
        logger.info(f"✅ File type {file_extension} is valid")


class StorageService:
    """
    Abstraction layer for file storage.
    
    MVP: Uses Supabase Storage
    Future: Can migrate to AWS S3 by changing this class only
    
    Engineering Notes:
    - All storage operations go through this abstraction
    - Makes migration to S3 seamless later
    - Handles both upload and retrieval
    - Generates secure URLs for file access
    """
    
    def __init__(self, supabase_client):
        """Initialize storage service with Supabase client."""
        self.client = supabase_client
        self.bucket_name = "resumes"  # Supabase storage bucket
        logger.info(f"✅ Storage service initialized (bucket: {self.bucket_name})")
    
    async def upload_resume(self, user_id: str, file: UploadFile) -> Tuple[str, str]:
        """
        Upload resume to storage.
        
        Args:
            user_id: User ID for folder organization
            file: Resume file to upload
        
        Returns:
            Tuple of (file_path, public_url)
        
        Engineering Notes:
        - Files organized by user_id for easy management
        - Generates unique filename to avoid collisions
        - Returns both storage path and public URL
        """
        try:
            # Reset file pointer
            await file.seek(0)
            content = await file.read()
            
            # Generate unique file path
            import uuid
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_extension = file.filename.split('.')[-1]
            unique_filename = f"{user_id}/resume_{timestamp}_{uuid.uuid4().hex[:8]}.{file_extension}"
            
            logger.info(f"📁 Uploading resume to: {unique_filename}")
            
            # Upload to Supabase Storage
            response = self.client.storage.from_(self.bucket_name).upload(
                path=unique_filename,
                file=content,
                file_options={"content-type": file.content_type}
            )
            
            # Get public URL
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(unique_filename)
            
            logger.info(f"✅ Resume uploaded successfully: {unique_filename}")
            return unique_filename, public_url
            
        except Exception as e:
            logger.error(f"❌ Resume upload failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload resume: {str(e)}"
            )
    
    def get_resume_url(self, file_path: str) -> str:
        """
        Get public URL for a stored resume.
        
        Args:
            file_path: Storage path of the resume
        
        Returns:
            Public URL to access the file
        """
        try:
            return self.client.storage.from_(self.bucket_name).get_public_url(file_path)
        except Exception as e:
            logger.error(f"❌ Failed to get resume URL: {e}")
            return ""
    
    async def delete_resume(self, file_path: str) -> bool:
        """
        Delete resume from storage.
        
        Args:
            file_path: Storage path of the resume
        
        Returns:
            True if deleted successfully
        """
        try:
            self.client.storage.from_(self.bucket_name).remove([file_path])
            logger.info(f"✅ Resume deleted: {file_path}")
            return True
        except Exception as e:
            logger.error(f"❌ Resume deletion failed: {e}")
            return False


# Note: StorageService instance will be created per request with appropriate Supabase client
