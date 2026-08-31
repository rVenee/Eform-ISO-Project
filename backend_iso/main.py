from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from fastapi.staticfiles import StaticFiles
import auth
import document
import users


app = FastAPI(title="E-Form ISO API")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend E-Form ISO Aktif!"}

@app.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Berhasil terhubung ke database dengan aman!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Koneksi gagal: {str(e)}")

app.include_router(auth.router)

app.include_router(document.router)

app.include_router(users.router)