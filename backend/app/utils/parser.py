import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.schemas import LocationCreate

def parse_google_takeout(file_content: bytes) -> List[LocationCreate]:
    """
    Parses Google Takeout Location History JSON content.
    Expects a JSON object with a "locations" key or a top-level list (older formats).
    """
    try:
        data = json.loads(file_content)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON file")

    locations_data = []
    if isinstance(data, dict):
        locations_data = data.get("locations", [])
    elif isinstance(data, list):
        locations_data = data
    
    parsed_locations = []
    
    for item in locations_data:
        # Extract required fields
        # Note: Google Takeout often uses E7 format for lat/lon (integer * 10^7)
        lat = item.get("latitudeE7")
        lon = item.get("longitudeE7")
        
        if lat is None or lon is None:
            continue
            
        latitude = float(lat) / 1e7
        longitude = float(lon) / 1e7
        
        # Timestamp parsing
        # Can be 'timestamp' (ISO string) or 'timestampMs' (string of milliseconds)
        ts_str = item.get("timestamp")
        ts_ms = item.get("timestampMs")
        
        timestamp = None
        if ts_str:
            try:
                # 2014-10-02T15:01:23.045Z
                timestamp = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except ValueError:
                pass
        
        if timestamp is None and ts_ms:
            try:
                # timestampMs is often a string
                timestamp = datetime.fromtimestamp(int(ts_ms) / 1000.0, tz=timezone.utc)
            except ValueError:
                pass
                
        if timestamp is None:
            continue
            
        loc = LocationCreate(
            timestamp=timestamp,
            latitude=latitude,
            longitude=longitude,
            accuracy=item.get("accuracy"),
            altitude=item.get("altitude"),
            heading=item.get("heading"),
            velocity=item.get("velocity"),
            source="google_takeout"
        )
        parsed_locations.append(loc)
        
    return parsed_locations
