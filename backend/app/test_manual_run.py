import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import create_db_and_tables
import os

# Initialize DB
create_db_and_tables()

client = TestClient(app)

def test_workflow():
    # 1. Create a dummy Google Takeout JSON file
    dummy_data = {
        "locations": [
            {
                "timestamp": "2023-10-01T12:00:00Z",
                "latitudeE7": 343853000,
                "longitudeE7": 1324553000,
                "accuracy": 20
            },
             {
                "timestampMs": "1696162800000", # 2023-10-01T12:20:00Z approx
                "latitudeE7": 343854000,
                "longitudeE7": 1324554000,
                "accuracy": 15
            }
        ]
    }
    
    file_content = json.dumps(dummy_data).encode('utf-8')
    files = {'file': ('test_takeout.json', file_content, 'application/json')}
    
    # 2. Upload
    print("Uploading file...")
    response = client.post("/api/upload/", files=files)
    print(f"Upload Status: {response.status_code}")
    print(f"Upload Response: {response.json()}")
    assert response.status_code == 200
    
    # 3. Query
    print("Querying locations...")
    response_get = client.get("/api/locations/")
    print(f"Query Status: {response_get.status_code}")
    data = response_get.json()
    print(f"Query Response Count: {len(data)}")
    print(f"Data: {data}")
    
    assert response_get.status_code == 200
    assert len(data) == 2
    assert data[0]["latitude"] == 34.3853
    
    print("\nSUCCESS: Workflow verified!")

if __name__ == "__main__":
    test_workflow()
