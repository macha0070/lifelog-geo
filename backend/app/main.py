from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_db_and_tables
from app.api.endpoints import upload, locations

app = FastAPI(title="Lifelog Geo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "Welcome to Lifelog Geo API"}

app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(locations.router, prefix="/api/locations", tags=["locations"])
