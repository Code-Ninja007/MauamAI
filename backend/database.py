from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import datetime
import os

# We default to SQLite for instant local development, but you can swap this with a PostgreSQL URL
# e.g., os.getenv("DATABASE_URL", "postgresql://user:password@localhost/mausam")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mausam.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    default_location = Column(String, default="Kanpur")
    
    personas = relationship("UserPersona", back_populates="user")

class UserPersona(Base):
    __tablename__ = "user_personas"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    persona_name = Column(String) # fitness, agriculture, commuter, traveler
    weight = Column(Float, default=1.0) # For multiple weighted personas
    
    user = relationship("User", back_populates="personas")

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    lat = Column(Float)
    lon = Column(Float)

class WeatherCache(Base):
    __tablename__ = "weather_cache"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, index=True)
    data = Column(JSON) # Store API response
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)
