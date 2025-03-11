from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from database import fs, highlights_collection
from bson import ObjectId
import io
from typing import List, Dict
from pydantic import BaseModel
import logging

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Upload PDF
@router.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        # Log the start of upload
        logger.info(f"Starting upload for file: {file.filename}")
        
        # Validate file type
        if not file.content_type == "application/pdf":
            logger.error(f"Invalid file type: {file.content_type}")
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed"
            )

        # Read file content
        pdf_data = await file.read()
        
        if len(pdf_data) == 0:
            logger.error("Empty file uploaded")
            raise HTTPException(
                status_code=400,
                detail="Empty file"
            )

        logger.info(f"File read successfully: {file.filename}, size: {len(pdf_data)} bytes")

        # Upload to GridFS
        try:
            pdf_id = await fs.upload_from_stream(
                file.filename,
                pdf_data,
                metadata={
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "size": len(pdf_data)
                }
            )
            
            logger.info(f"File uploaded successfully to GridFS with ID: {pdf_id}")
            
            return JSONResponse(
                status_code=200,
                content={
                    "message": "PDF uploaded successfully",
                    "pdf_id": str(pdf_id),
                    "filename": file.filename
                }
            )
        except Exception as e:
            logger.error(f"GridFS upload error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error uploading to GridFS: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )

# Get PDF by ID
@router.get("/pdf/{pdf_id}")
async def get_pdf(pdf_id: str):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(pdf_id):
            raise HTTPException(status_code=400, detail="Invalid PDF ID format")

        pdf_stream = await fs.open_download_stream(ObjectId(pdf_id))
        pdf_data = await pdf_stream.read()
        
        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={pdf_stream.metadata['filename']}",
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving PDF: {str(e)}")
        raise HTTPException(status_code=404, detail="PDF not found")

# 📌 **Model for Highlight Data**
class Highlight(BaseModel):
    pdf_id: str
    user_id: str  # Optional: If authentication is used
    highlights: List[Dict]  # List of highlight objects (position, text, color, etc.)

# ✅ **Save Highlights**
@router.post("/highlights/")
async def save_highlight(data: Highlight):
    """Save highlights for a specific PDF"""
    try:
        highlight_data = data.dict()
        await highlights_collection.insert_one(highlight_data)
        return {"message": "Highlights saved successfully"}
    except Exception as e:
        logger.error(f"Error saving highlights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error saving highlights: {str(e)}"
        )

# ✅ **Get Highlights for a PDF**
@router.get("/highlights/{pdf_id}")
async def get_highlights(pdf_id: str):
    """Retrieve all highlights for a given PDF"""
    try:
        cursor = highlights_collection.find({"pdf_id": pdf_id}, {"_id": 0})
        highlights = await cursor.to_list(length=None)
        return {"pdf_id": pdf_id, "highlights": highlights}
    except Exception as e:
        logger.error(f"Error retrieving highlights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving highlights: {str(e)}"
        )