import httpx
import os
import math
import hashlib
from datetime import datetime

# Real weather API integration
# Users can provide an OpenWeatherMap API Key, otherwise it falls back to a graceful mock.
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")

async def fetch_real_weather(location: str):
    if not WEATHER_API_KEY:
        return get_mock_weather(location)
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Current weather
            url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={WEATHER_API_KEY}&units=metric"
            response = await client.get(url, timeout=8.0)
            if response.status_code != 200:
                return get_mock_weather(location)
            
            data = response.json()
            lat = data["coord"]["lat"]
            lon = data["coord"]["lon"]
            temp = data["main"]["temp"]
            humidity = data["main"]["humidity"]
            wind = data["wind"]["speed"]
            condition = data["weather"][0]["main"]
            
            # Rain in last 1h/3h if available
            rain_1h = data.get("rain", {}).get("1h", 0)
            rain_3h = data.get("rain", {}).get("3h", 0)
            recent_rain_mm = round(rain_1h or rain_3h, 1)
            
            # Cloud cover → estimate rain probability
            clouds = data.get("clouds", {}).get("all", 0)
            rain_prob = 0
            
            # 2. Try to get forecast for actual rain probability
            try:
                forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&cnt=8"
                fc_resp = await client.get(forecast_url, timeout=8.0)
                if fc_resp.status_code == 200:
                    fc_data = fc_resp.json()
                    # Extract pop (probability of precipitation) from forecast slots
                    pops = [slot.get("pop", 0) for slot in fc_data.get("list", [])]
                    if pops:
                        rain_prob = round(max(pops) * 100)  # pop is 0-1, convert to %
                    
                    # Sum up rain from forecast for "recent rainfall" estimate
                    total_rain = sum(
                        slot.get("rain", {}).get("3h", 0) 
                        for slot in fc_data.get("list", [])
                    )
                    if total_rain > recent_rain_mm:
                        recent_rain_mm = round(total_rain, 1)
            except Exception:
                # Fallback: estimate from clouds + condition
                if condition in ["Rain", "Drizzle", "Thunderstorm"]:
                    rain_prob = max(60, clouds)
                else:
                    rain_prob = min(clouds, 40)
            
            # 3. Try AQI
            aqi_val = 50
            try:
                aqi_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}"
                aqi_resp = await client.get(aqi_url, timeout=5.0)
                if aqi_resp.status_code == 200:
                    aqi_data = aqi_resp.json()
                    # OWM gives AQI 1-5, convert to approximate EPA scale
                    owm_aqi = aqi_data["list"][0]["main"]["aqi"]
                    pm25 = aqi_data["list"][0]["components"].get("pm2_5", 0)
                    # Use PM2.5 for more granular AQI
                    if pm25 <= 12: aqi_val = round(pm25 * 4.17)
                    elif pm25 <= 35.4: aqi_val = round(50 + (pm25 - 12) * 2.13)
                    elif pm25 <= 55.4: aqi_val = round(100 + (pm25 - 35.4) * 2.5)
                    else: aqi_val = round(150 + (pm25 - 55.4) * 1.67)
                    aqi_val = max(1, min(aqi_val, 500))
            except Exception:
                pass
            
            # 4. Try UV index
            uv_val = 5
            try:
                # OneCall 3.0 has UV, but if not available use estimate from lat
                abs_lat = abs(lat)
                hour = datetime.utcnow().hour
                # Basic UV model: higher near equator, peaks midday
                solar_factor = max(0, math.cos(math.radians((hour - 12) * 15)))
                lat_factor = max(0.3, 1 - abs_lat / 90)
                uv_val = round(12 * lat_factor * solar_factor * (1 - clouds / 200), 1)
                uv_val = max(0, min(uv_val, 12))
            except Exception:
                pass
            
            return {
                "temp": round(temp, 1),
                "humidity": humidity,
                "wind": round(wind, 1),
                "rain_prob": rain_prob,
                "recent_rain_mm": recent_rain_mm,
                "aqi": aqi_val,
                "uv": uv_val,
                "condition": condition,
                "clouds": clouds,
                "lat": lat,
                "lon": lon,
            }
    except Exception as e:
        print(f"Weather API Error: {e}")
        return get_mock_weather(location)

def get_mock_weather(location: str):
    """Deterministic but realistic mock — varies by city name AND time of day."""
    # Create a stable hash from the location name
    h = int(hashlib.md5(location.lower().encode()).hexdigest(), 16)
    
    hour = datetime.now().hour
    # Temperature: 22-38 range, cooler at night
    night_adj = -4 if (hour < 6 or hour > 20) else 0
    base_temp = 24 + (h % 14) + night_adj
    
    # Rain prob: vary 10-85%
    rain_prob = 10 + (h % 75)
    
    # AQI: 30-220 range
    aqi = 30 + (h % 190)
    
    # UV: 2-11 range, 0 at night
    uv = 0 if (hour < 6 or hour > 18) else 2 + (h % 9)
    
    # Condition based on rain_prob
    if rain_prob > 65:
        condition = "Rain"
    elif rain_prob > 45:
        condition = "Clouds"
    elif rain_prob > 25:
        condition = "Haze"
    else:
        condition = "Clear"
    
    # Recent rainfall
    recent_rain = round((h % 30) * (rain_prob / 100), 1)
    
    return {
        "temp": base_temp, 
        "rain_prob": rain_prob, 
        "recent_rain_mm": recent_rain,
        "aqi": aqi, 
        "uv": uv, 
        "wind": 4 + (h % 18), 
        "humidity": 40 + (h % 50),
        "condition": condition,
        "clouds": 10 + (h % 80),
    }
