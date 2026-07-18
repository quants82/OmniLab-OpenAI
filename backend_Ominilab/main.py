from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_user, get_user_by_username, init_database
from routers import ai, auth, lab
from security import hash_password


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    if settings.demo_username and settings.demo_password and not get_user_by_username(settings.demo_username):
        create_user(settings.demo_username, hash_password(settings.demo_password))
    yield


app = FastAPI(
    title=settings.app_name,
    description="Open-source backend for six ESP32 physics experiments and an OpenAI lab assistant.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(lab.router)
app.include_router(ai.router)


@app.get("/")
def root() -> dict:
    return {
        "name": settings.app_name,
        "status": "open",
        "docs": "/docs",
        "health": "/api/lab/health",
    }
