from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.database import get_session
from app.schemas import LocationRead
from app.crud import get_locations
from typing import List, Optional
from datetime import datetime

router = APIRouter()

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
