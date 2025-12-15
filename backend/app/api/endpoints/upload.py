from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from app.database import get_session
from app.utils.parser import parse_google_takeout
from app.crud import create_locations_batch
import shutil
import tempfile
import os

router = APIRouter()

def process_file_background(file_content: bytes, session: Session):
    try:
        locations = parse_google_takeout(file_content)
        create_locations_batch(session, locations)
    except Exception as e:
        print(f"Error processing file: {e}")

@router.post("/")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    # For simplicity in this phase, reading the whole file into memory. 
    # For very large Takeout files (>100MB), we might need streaming or chunking later.
    content = await file.read()
    
    try:
        # Validate parsing quickly before backgrounding? 
        # Or just background it. Let's do a quick check or just standard background processing.
        # Given potential size, let's process in background but we need a session.
        # Passing session to background task can be tricky if session closes.
        # Better: parse synchronously if not too huge, OR handle session carefully.
        # For simplicity Phase 1: simple synchronous parsing loc by loc or batch.
        
        locations = parse_google_takeout(content)
        create_locations_batch(session, locations)
        
        return {"message": f"Successfully processed {len(locations)} locations from {file.filename}"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
