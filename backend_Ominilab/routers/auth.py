from __future__ import annotations

import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from database import create_user, get_user_by_username
from dependencies import current_user
from security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/api/auth", tags=["authentication"])


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


def _public_user(user: dict) -> dict:
    return {"id": user["id"], "username": user["username"], "created_at": user["created_at"]}


def _token_response(user: dict) -> dict:
    return {
        "access_token": create_access_token(int(user["id"])),
        "token_type": "bearer",
        "user": _public_user(user),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: Credentials) -> dict:
    try:
        user = create_user(payload.username, hash_password(payload.password))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Username is already registered") from exc
    return _token_response(user)


@router.post("/login")
def login(payload: Credentials) -> dict:
    user = get_user_by_username(payload.username)
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return _token_response(user)


@router.get("/me")
def me(user: Annotated[dict, Depends(current_user)]) -> dict:
    return _public_user(user)
