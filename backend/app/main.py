from fastapi import FastAPI, Depends
from db.database import get_db, create_tables
from models.models import SwellData
from sqlalchemy.orm import Session


create_tables()
db = get_db()
app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
    
@app.get("/swelldata")
def read_swell_data(db: Session = Depends(get_db)):
    data = db.query(SwellData).all()
    return data