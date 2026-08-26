from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

app = FastAPI(title="E-Form ISO API")

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