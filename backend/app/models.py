from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel

class Location(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(index=True)
    latitude: float
    longitude: float
    accuracy: Optional[int] = None
    altitude: Optional[int] = None
    heading: Optional[int] = None
    velocity: Optional[int] = None
    source: Optional[str] = Field(default="unknown")  # e.g., "google_takeout"
