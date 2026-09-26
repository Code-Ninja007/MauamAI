import httpx
import os
from datetime import datetime

# Real weather API integration
# Users can provide an OpenWeatherMap API Key, otherwise it falls back to a graceful mock.
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")

async def fetch_real_weather(location: str):
    if not WEATHER_API_KEY:
        return get_mock_weather(location)
    
    # In a real scenario, you'd geo-code the location to lat/lon first or use the q parameter
    url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={WEATHER_API_KEY}&units=metric"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                return {
                    "temp": data["main"]["temp"],
                    "humidity": data["main"]["humidity"],
                    "wind": data["wind"]["speed"],
                    "rain_prob": 0, # OWM current doesn't have rain prob, mock for now
                    "aqi": 50, # Separate API call needed in real life
                    "uv": 5, # Separate API call needed
                    "condition": data["weather"][0]["main"]
                }
            else:
                return get_mock_weather(location)
    except Exception as e:
        print(f"Weather API Error: {e}")
        return get_mock_weather(location)

def get_mock_weather(location: str):
    # Deterministic mock based on location length so it "changes" per city slightly
    base_temp = 25 + len(location)
    return {
        "temp": base_temp, 
        "rain_prob": 72, 
        "aqi": 94, 
        "uv": 8, 
        "wind": 14, 
        "humidity": 65,
        "condition": "Cloudy"
    }
