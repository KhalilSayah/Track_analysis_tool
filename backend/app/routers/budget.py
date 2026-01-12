from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from app.core.budget_agent import process_budget_chat

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    api_key: Optional[str] = None

@router.post("/chat")
async def budget_chat(request: ChatRequest):
    try:
        # Use provided API key or fallback to env
        api_key = request.api_key or os.getenv("MISTRAL_API_KEY", "9WzPqRnYfvFcH6Osj6KVQOIK1gPjNfrH")
        
        response = process_budget_chat(
            [msg.dict() for msg in request.messages], 
            api_key
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
