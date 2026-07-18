from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from config import settings
from dependencies import current_user


router = APIRouter(prefix="/api/ai", tags=["openai-lab-assistant"])


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=12_000)


class ExplainRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=20)
    max_tokens: int = Field(default=800, ge=100, le=2_000)


@router.post("/explain")
async def explain(
    payload: ExplainRequest,
    _: Annotated[dict, Depends(current_user)],
) -> dict:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        response = await client.responses.create(
            model=settings.openai_model,
            input=[message.model_dump() for message in payload.messages],
            max_output_tokens=payload.max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}") from exc

    content = response.output_text or "{}"
    return {
        "model": settings.openai_model,
        "choices": [{"message": {"role": "assistant", "content": content}}],
    }
