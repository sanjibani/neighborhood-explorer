"""/api/echo-llm — Phase 0 endpoint to verify MiniMax wiring works end-to-end."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.llm import complete

router = APIRouter(tags=["dev"])


class EchoRequest(BaseModel):
    prompt: str = "Say hello in 5 words or fewer."


class EchoResponse(BaseModel):
    prompt: str
    completion: str


@router.post("/api/echo-llm", response_model=EchoResponse)
async def echo_llm(req: EchoRequest):
    try:
        text = complete(req.prompt)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"LLM call failed: {exc}")
    return EchoResponse(prompt=req.prompt, completion=text)