from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from database import SessionLocal, User, UserPersona, Location, WeatherCache, engine
from weather_api import fetch_real_weather
from scoring_engine import rank_widgets
from sqlalchemy.orm import Session

app = FastAPI(title="Mausam AI+ Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class WidgetResponse(BaseModel):
    type: str
    priority: float
    title: str
    data: dict
    explanation: Optional[str] = None

class PersonalizedHomeResponse(BaseModel):
    user: dict
    location: str
    alert: Optional[dict] = None
    widgets: List[WidgetResponse]

@app.get("/api/personalized-home", response_model=PersonalizedHomeResponse)
async def get_personalized_home(persona: str = "fitness", location: str = "Kanpur", username: str = "Guest", destination: Optional[str] = None, trigger_alert: bool = False, db: Session = Depends(get_db)):
    
    # 1. DB Integration: Get or Create User
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username, default_location=location)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Add persona weight
        up = UserPersona(user_id=user.id, persona_name=persona, weight=1.0)
        db.add(up)
        db.commit()
    else:
        up = db.query(UserPersona).filter(UserPersona.user_id == user.id).first()
        if up and up.persona_name != persona:
            up.persona_name = persona
            db.commit()

    # 2. Weather Integration: Origin
    weather_entry = db.query(WeatherCache).filter(WeatherCache.location == location).first()
    if not weather_entry:
        weather_data = await fetch_real_weather(location)
        weather_entry = WeatherCache(location=location, data=weather_data)
        db.add(weather_entry)
        db.commit()
    else:
        weather_data = weather_entry.data
        
    # Destination Weather
    dest_weather_data = None
    if destination:
        dest_entry = db.query(WeatherCache).filter(WeatherCache.location == destination).first()
        if not dest_entry:
            dest_weather_data = await fetch_real_weather(destination)
            dest_entry = WeatherCache(location=destination, data=dest_weather_data)
            db.add(dest_entry)
            db.commit()
        else:
            dest_weather_data = dest_entry.data

    # 3. Dynamic Scoring Engine
    current_hour = datetime.now().hour
    widgets = rank_widgets(persona, weather_data, current_hour, destination, dest_weather_data)
    
    alert = None
    # 4. Safety Override
    if trigger_alert:
        alert = {
            "type": "severe_alert",
            "title": "⚠ SEVERE WEATHER ALERT",
            "severity": "HIGH",
            "message": "Heavy rainfall and thunderstorms expected in the next 2 hours."
        }
        widgets.insert(0, {
            "type": "severe_alert", 
            "title": "⚠ SEVERE WEATHER ALERT", 
            "priority": 1.0, 
            "data": alert
        })

    return {
        "user": {"username": user.username, "persona": persona, "user_id": user.id},
        "location": location,
        "alert": alert,
        "widgets": widgets
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
