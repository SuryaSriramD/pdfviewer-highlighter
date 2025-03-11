from fastapi import APIRouter, HTTPException
from database import highlights_collection
from bson import ObjectId
from typing import List
from pydantic import BaseModel

router = APIRouter()

# Highlight Model
class Highlight(BaseModel):
    pdf_id: str
    user_id: str
    coordinates: dict  # {x, y, width, height}
    text: str
    color: str

@router.post("/")
async def add_highlight(highlight: Highlight):
    result = await highlights_collection.insert_one(highlight.model_dump())
    return {"message": "Highlight saved", "highlight_id": str(result.inserted_id)}

@router.get("/{pdf_id}")
async def get_highlights(pdf_id: str):
    highlights_cursor = highlights_collection.find({"pdf_id": pdf_id}, {"_id": 0})  
    highlights = await highlights_cursor.to_list(None)  # ✅ Correct way to fetch results
    
    if not highlights:
        raise HTTPException(status_code=404, detail="No highlights found")

    return {"highlights": highlights}
