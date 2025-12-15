from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel

class LocationBase(SQLModel):
    timestamp: datetime
    latitude: float
    longitude: float
    accuracy: Optional[int] = None
    altitude: Optional[int] = None
    heading: Optional[int] = None
    velocity: Optional[int] = None
    source: Optional[str] = "unknown"

class LocationCreate(LocationBase):
    pass

class LocationRead(LocationBase):
    id: int
