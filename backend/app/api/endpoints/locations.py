from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.database import get_session
from typing import List, Dict, Optional
from app.schemas import LocationRead, LocationCreate
from app.crud import get_locations, create_locations_batch
from typing import List, Optional
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Dict[str, str])
def create_manual_trip(
    locations: List[LocationCreate],
    session: Session = Depends(get_session)
):
    """
    Create multiple location points (e.g. for manual trip entry).
    """
    create_locations_batch(session, locations)
    return {"message": f"Successfully created {len(locations)} points"}

@router.get("/", response_model=List[LocationRead])
def read_locations(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    session: Session = Depends(get_session)
):
    """
    Get location history with optional time filtering.
    """
    return get_locations(session, start_date, end_date)
