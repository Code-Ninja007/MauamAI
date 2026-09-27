def calculate_score(widget_type: str, persona_weight: float, weather_context_score: float, time_score: float = 0.5):
    # Coefficients
    alpha = 0.4
    beta = 0.3
    gamma = 0.1
    delta = 0.2
    
    score = (alpha * persona_weight) + (beta * weather_context_score) + (delta * time_score)
    return round(score, 2)

def derive_running_window(weather_data: dict, current_hour: int):
    temp = weather_data.get("temp", 30)
    rain = weather_data.get("rain_prob", 0)
    if temp < 28 and rain < 20:
        return {"status": "Excellent", "time": "Now until 10:00 AM"}
    elif temp < 32 and rain < 50:
        return {"status": "Fair", "time": "Early morning or late evening"}
    return {"status": "Poor", "time": "Try an indoor workout"}

def derive_commute_weather(weather_data: dict):
    rain = weather_data.get("rain_prob", 0)
    if rain > 60:
        return {"status": "High disruption risk", "delay_prob": "High", "advice": "Leave 20 mins early."}
    if rain > 20:
        return {"status": "Slight rain expected", "delay_prob": "Medium", "advice": "Carry an umbrella."}
    return {"status": "Clear", "delay_prob": "Low", "advice": "Smooth commute expected."}

def derive_packing_guide(weather_data: dict):
    temp = weather_data.get("temp", 30)
    rain = weather_data.get("rain_prob", 0)
    items = []
    if rain > 40: items.extend(["Umbrella", "Raincoat"])
    if temp > 28: items.extend(["Sunscreen", "Sunglasses", "Light clothing"])
    elif temp < 15: items.extend(["Jacket", "Warm layers"])
    if not items: items = ["Standard travel kit"]
    return {"items": items}

def rank_widgets(persona: str, weather_data: dict, current_hour: int = 12, destination: str = None, dest_weather: dict = None):
    widgets = [
        {"type": "current_weather", "title": "Current Weather"},
        {"type": "running_window", "title": "Best Running Time (AI Derived)"},
        {"type": "aqi", "title": "Air Quality Index"},
        {"type": "uv", "title": "UV Index"},
        {"type": "hourly_forecast", "title": "Hourly Forecast"},
        {"type": "rain_forecast", "title": "Rain Forecast"},
        {"type": "rainfall", "title": "Recent Rainfall"},
        {"type": "agriculture_indicator", "title": "Agri Indicator (AI Derived)"},
        {"type": "commute_window", "title": "Commute Weather (AI Derived)"},
        {"type": "rain_probability", "title": "Rain Probability"},
        {"type": "visibility", "title": "Visibility"},
        {"type": "travel_weather", "title": "Destination Weather"},
        {"type": "packing_recommendation", "title": "Packing Guide (AI Derived)"},
        {"type": "route_weather", "title": "Route Weather (AI Derived)"},
        # New persona specific widgets
        {"type": "pollen_count", "title": "Pollen Count"},
        {"type": "sun_times", "title": "Sunrise / Sunset"},
        {"type": "heat_alerts", "title": "Heat Alerts"},
        {"type": "sea_conditions", "title": "Sea Conditions"},
        {"type": "tide_timings", "title": "Tide Timings"},
        {"type": "saved_destinations", "title": "Saved Destinations"},
        {"type": "flight_alerts", "title": "Flight & Severe Alerts"},
        {"type": "school_commute", "title": "School Commute Conditions"},
        {"type": "family_rain_alerts", "title": "Family Rain Alerts"},
        {"type": "frost_alerts", "title": "Frost Risk"},
        {"type": "planting_guidance", "title": "Seasonal Planting Guidance"},
        {"type": "traffic_updates", "title": "Traffic & Weather Integration"},
        {"type": "extended_forecast", "title": "Extended Planner Forecast"},
        {"type": "comfort_index", "title": "Event Comfort Index"},
    ]

    scored_widgets = []
    
    for w in widgets:
        p_weight = 0.1
        
        # Original
        if persona == "fitness" and w["type"] in ["running_window", "aqi", "uv", "sun_times", "heat_alerts", "current_weather"]: p_weight = 0.95
        elif persona == "agriculture" and w["type"] in ["rain_forecast", "rainfall", "agriculture_indicator", "frost_alerts", "planting_guidance", "current_weather"]: p_weight = 0.95
        elif persona == "commuter" and w["type"] in ["commute_window", "traffic_updates", "visibility", "current_weather"]: p_weight = 0.95
        elif persona == "traveler" and w["type"] in ["travel_weather", "route_weather", "packing_recommendation", "saved_destinations", "flight_alerts", "current_weather"]: p_weight = 0.95
        # New
        elif persona == "health" and w["type"] in ["aqi", "pollen_count", "uv", "current_weather"]: p_weight = 0.95
        elif persona == "adventure" and w["type"] in ["sea_conditions", "tide_timings", "uv", "current_weather"]: p_weight = 0.95
        elif persona == "family" and w["type"] in ["school_commute", "family_rain_alerts", "hourly_forecast", "current_weather"]: p_weight = 0.95
        elif persona == "event" and w["type"] in ["extended_forecast", "comfort_index", "rain_probability", "current_weather"]: p_weight = 0.95
        
        w_score = 0.5
        if "rain" in w["type"] and weather_data.get("rain_prob", 0) > 50: w_score = 0.9
        if w["type"] == "uv" and weather_data.get("uv", 0) > 6: w_score = 0.9
        if w["type"] == "aqi" and weather_data.get("aqi", 0) > 100: w_score = 0.9
        if w["type"] == "heat_alerts" and weather_data.get("temp", 30) > 35: w_score = 0.95

        t_score = 0.5
        if w["type"] in ["commute_window", "school_commute", "traffic_updates"] and (7 <= current_hour <= 10 or 15 <= current_hour <= 19): t_score = 0.9
        if w["type"] == "running_window" and (5 <= current_hour <= 8): t_score = 0.9
        if w["type"] == "sun_times" and (5 <= current_hour <= 7 or 17 <= current_hour <= 19): t_score = 0.9

        score = calculate_score(w["type"], p_weight, w_score, t_score)
        
        # Build explanation
        explanation = f"Score: {score}. Persona matches {int(p_weight*100)}% | Context importance: {int(w_score*100)}% | Time relevance: {int(t_score*100)}%"
        
        data = {}
        if w["type"] == "current_weather": data = weather_data
        elif w["type"] == "running_window": data = derive_running_window(weather_data, current_hour)
        elif w["type"] == "commute_window": data = derive_commute_weather(weather_data)
        elif w["type"] == "packing_recommendation": data = derive_packing_guide(dest_weather if dest_weather else weather_data)
        elif w["type"] == "rain_forecast": data = {"chance": f"{weather_data.get('rain_prob', 0)}%", "next_3h": f"{max(0, weather_data.get('rain_prob', 0) - 10)}%", "next_6h": f"{max(0, weather_data.get('rain_prob', 0) - 25)}%"}
        elif w["type"] == "agriculture_indicator": data = {"soil_moisture": "Optimal" if weather_data.get("recent_rain_mm", 0) > 5 else "Low", "pest_risk": "High" if weather_data.get("humidity", 50) > 75 else "Low"}
        elif w["type"] == "uv": data = {"index": weather_data.get("uv", 5), "status": "Low" if weather_data.get("uv", 5) < 3 else ("Moderate" if weather_data.get("uv", 5) < 6 else ("High" if weather_data.get("uv", 5) < 8 else "Very High"))}
        elif w["type"] == "aqi": data = {"value": weather_data.get("aqi", 50), "status": "Good" if weather_data.get("aqi", 50) <= 50 else ("Moderate" if weather_data.get("aqi", 50) <= 100 else ("Unhealthy" if weather_data.get("aqi", 50) <= 150 else "Poor"))}
        elif w["type"] == "hourly_forecast": data = {"next_hour": f"{weather_data.get('temp', 25)}\u00b0C, {weather_data.get('condition', 'Clear')}"}
        elif w["type"] == "rainfall": data = {"amount": f"{weather_data.get('recent_rain_mm', 0)}mm in last 24h"}
        elif w["type"] == "rain_probability": data = {"probability": f"{weather_data.get('rain_prob', 0)}%"}
        elif w["type"] == "visibility": data = {"distance": "10 km"}
        
        # New Widget Data Logic
        elif w["type"] == "pollen_count": data = {"level": "High", "advice": "Wear a mask if sensitive."}
        elif w["type"] == "sun_times": data = {"sunrise": "6:14 AM", "sunset": "6:32 PM"}
        elif w["type"] == "heat_alerts": data = {"status": "Clear", "message": "No extreme heat expected today." if weather_data.get("temp", 30) < 35 else "Extreme Heat Advisory!"}
        elif w["type"] == "sea_conditions": data = {"wave_height": "1.2m", "water_temp": "26°C"}
        elif w["type"] == "tide_timings": data = {"high_tide": "10:45 AM", "low_tide": "4:30 PM"}
        elif w["type"] == "saved_destinations": 
            if destination and dest_weather:
                data = {"recent_search": f"{destination.title()}: {dest_weather.get('temp', 28)}°C, {dest_weather.get('condition', 'Clear')}"}
            else:
                data = {"status": "No saved destinations yet. Search for a city above!"}
        elif w["type"] == "flight_alerts": data = {"status": "All Clear", "message": "No severe weather impacting major hubs."}
        elif w["type"] == "school_commute": data = {"morning": "Clear", "afternoon": "Light Rain expected at pickup."}
        elif w["type"] == "family_rain_alerts": data = {"alert": "No rain expected during outdoor playtime (4-6 PM)."}
        elif w["type"] == "frost_alerts": data = {"risk": "Low", "temp_min": "14°C"}
        elif w["type"] == "planting_guidance": data = {"season": "Kharif", "advice": "Good time for sowing given recent soil moisture."}
        elif w["type"] == "traffic_updates": data = {"status": "Moderate delays", "weather_impact": "None"}
        elif w["type"] == "extended_forecast": data = {"weekend": "Sunny, 28°C", "next_week": "Rainy, 24°C"}
        elif w["type"] == "comfort_index": data = {"score": "8.5/10", "advice": "Perfect for outdoor gatherings!"}
        
        elif w["type"] == "travel_weather": 
            if destination and dest_weather:
                data = {"destination": destination, "temp": dest_weather.get("temp", 28), "condition": dest_weather.get("condition", "Clear"), "rain_prob": dest_weather.get("rain_prob", 0)}
            else:
                data = {"destination": "Not set", "temp": "--", "condition": "--"}
        elif w["type"] == "route_weather":
            if destination and dest_weather:
                data = {
                    "origin": {"temp": weather_data.get("temp", 30), "condition": weather_data.get("condition", "Clear")},
                    "midpoint": {"temp": round((weather_data.get("temp", 30) + dest_weather.get("temp", 28)) / 2), "condition": "Cloudy"},
                    "destination": {"temp": dest_weather.get("temp", 28), "condition": dest_weather.get("condition", "Clear")}
                }
            else:
                data = {"message": "Set a destination to see route weather."}
        else: data = {"value": "Data unavailable"}
        
        # Don't show travel specific widgets if no destination is set (except packing which falls back to local)
        if w["type"] in ["travel_weather", "route_weather"] and not destination:
            continue

        scored_widgets.append({
            "type": w["type"],
            "title": w["title"],
            "priority": score,
            "data": data,
            "explanation": explanation
        })

    scored_widgets.sort(key=lambda x: x["priority"], reverse=True)
    return scored_widgets[:5]
