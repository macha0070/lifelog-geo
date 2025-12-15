from sqlmodel import Session, select
from app.models import Location
from app.schemas import LocationCreate
from datetime import datetime
from typing import List, Optional

def create_location(session: Session, location: LocationCreate) -> Location:
    db_location = Location.model_validate(location)
    session.add(db_location)
    session.commit()
    session.refresh(db_location)
    return db_location

def get_locations(session: Session, start_time: Optional[datetime], end_time: Optional[datetime]) -> List[Location]:
    statement = select(Location)
    if start_time:
        statement = statement.where(Location.timestamp >= start_time)
    if end_time:
        statement = statement.where(Location.timestamp <= end_time)
    statement = statement.order_by(Location.timestamp)
    return session.exec(statement).all()

def create_locations_batch(session: Session, locations: List[LocationCreate]):
    db_locations = [Location.model_validate(loc) for loc in locations]
    session.add_all(db_locations)
    session.commit()
