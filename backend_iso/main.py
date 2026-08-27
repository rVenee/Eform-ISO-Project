from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
import auth
import document
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="E-Form ISO API")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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