from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from database import fs, highlights_collection, pdf_history_collection
from bson import ObjectId
import io
from typing import List, Dict
from pydantic import BaseModel
import logging
from datetime import datetime

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

# New endpoint to record PDF access
@router.post("/access/{pdf_id}")
async def record_pdf_access(pdf_id: str, user_id: str = "default-user"):
    """Record when a user accesses a PDF"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(pdf_id):
            raise HTTPException(status_code=400, detail="Invalid PDF ID format")
            
        # Get PDF metadata
        pdf_info = None
        try:
            # Find the file in GridFS
            grid_out = await fs.open_download_stream(ObjectId(pdf_id))
            pdf_info = {
                "filename": grid_out.metadata.get("filename", "Unnamed PDF"),
                "content_type": grid_out.metadata.get("content_type", "application/pdf"),
                "size": grid_out.metadata.get("size", 0),
                "upload_date": grid_out.upload_date
            }
        except Exception as e:
            logger.error(f"Error retrieving PDF metadata: {str(e)}")
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Record the access
        await pdf_history_collection.update_one(
            {"pdf_id": pdf_id, "user_id": user_id},
            {
                "$set": {
                    "pdf_id": pdf_id,
                    "user_id": user_id,
                    "filename": pdf_info["filename"],
                    "last_accessed": datetime.utcnow()
                },
                "$inc": {"access_count": 1}
            },
            upsert=True
        )
        
        return {"message": "Access recorded successfully"}
    except Exception as e:
        logger.error(f"Error recording PDF access: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error recording PDF access: {str(e)}"
        )

# New endpoint to get recently accessed PDFs
@router.get("/recent/{user_id}")
async def get_recent_pdfs(user_id: str = "default-user", limit: int = 5):
    """Get recently accessed PDFs for a user"""
    try:
        cursor = pdf_history_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("last_accessed", -1).limit(limit)
        
        recent_pdfs = await cursor.to_list(length=limit)
        return {"recent_pdfs": recent_pdfs}
    except Exception as e:
        logger.error(f"Error retrieving recent PDFs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving recent PDFs: {str(e)}"
        )

# New endpoint to clear PDF access history
@router.delete("/recent/clear/{user_id}")
async def clear_recent_pdfs(user_id: str = "default-user"):
    """Clear recently accessed PDFs for a user"""
    try:
        result = await pdf_history_collection.delete_many({"user_id": user_id})
        return {"message": f"Cleared {result.deleted_count} records"}
    except Exception as e:
        logger.error(f"Error clearing recent PDFs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing recent PDFs: {str(e)}"
        )

# New endpoint to delete a specific highlight
@router.delete("/highlights/{pdf_id}/{highlight_id}")
async def delete_highlight(pdf_id: str, highlight_id: str):
    """Delete a specific highlight from a PDF"""
    try:
        logger.info(f"Attempting to delete highlight with timestamp {highlight_id} from PDF {pdf_id}")
        
        # First, get the current highlights
        cursor = highlights_collection.find({"pdf_id": pdf_id})
        documents = await cursor.to_list(length=None)
        
        if not documents:
            logger.error(f"No highlight documents found for PDF {pdf_id}")
            raise HTTPException(status_code=404, detail="No highlights found for this PDF")
        
        # For each document, check if it contains the highlight with the given timestamp
        deleted = False
        for doc in documents:
            if "highlights" in doc and isinstance(doc["highlights"], list):
                # Find the highlight with the matching timestamp
                filtered_highlights = [h for h in doc["highlights"] if h.get("timestamp") != highlight_id]
                
                # If we found and removed a highlight
                if len(filtered_highlights) < len(doc["highlights"]):
                    # Update the document with the filtered highlights
                    result = await highlights_collection.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {"highlights": filtered_highlights}}
                    )
                    
                    if result.modified_count > 0:
                        deleted = True
                        logger.info(f"Successfully deleted highlight {highlight_id}")
                    else:
                        logger.warning(f"Failed to update document after filtering highlight {highlight_id}")
        
        if deleted:
            return {"message": "Highlight deleted successfully"}
        else:
            logger.error(f"Highlight with timestamp {highlight_id} not found in any document")
            raise HTTPException(status_code=404, detail="Highlight not found")
            
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error deleting highlight: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting highlight: {str(e)}"
        )

# Get PDF info
@router.get("/info/{pdf_id}")
async def get_pdf_info(pdf_id: str):
    """Get PDF information including filename"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(pdf_id):
            raise HTTPException(status_code=400, detail="Invalid PDF ID format")

        # Get the file info from GridFS
        try:
            grid_out = await fs.open_download_stream(ObjectId(pdf_id))
            return {
                "filename": grid_out.metadata.get("filename", "Untitled PDF"),
                "content_type": grid_out.metadata.get("content_type", "application/pdf"),
                "size": grid_out.metadata.get("size", 0),
                "upload_date": grid_out.upload_date
            }
        except Exception as e:
            logger.error(f"Error retrieving PDF info: {str(e)}")
            raise HTTPException(status_code=404, detail="PDF not found")
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting PDF info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting PDF info: {str(e)}"
        )