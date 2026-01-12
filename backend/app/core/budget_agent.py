import os
import json
from mistralai import Mistral

def process_budget_chat(messages, api_key):
    """
    Processes the chat history for Budget Management.
    
    Args:
        messages (list): List of message objects [{"role": "user", "content": "..."}, ...].
        api_key (str): Mistral API Key.
        
    Returns:
        dict: 
            { "type": "message", "content": "..." } 
            OR 
            { "type": "action", "payload": {...} }
    """
    if not api_key:
        return {"type": "error", "content": "API Key is missing."}

    client = Mistral(api_key=api_key)

    # Load System Prompt
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(current_dir, "budget_prompt.md")
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        return {"type": "error", "content": "System prompt not found."}

    # Prepare messages
    # Ensure system prompt is first
    final_messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]
    
    # Append conversation history
    # Filter out any internal frontend fields if present, keeping only role and content
    for msg in messages:
        if msg.get("role") in ["user", "assistant"]:
            final_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    try:
        chat_response = client.chat.complete(
            model="mistral-large-latest",
            messages=final_messages
        )
        
        content = chat_response.choices[0].message.content.strip()
        
        # Check if it's the JSON action
        # The prompt says "Output structured JSON ONLY... No additional text"
        # We look for a JSON block
        
        json_payload = None
        
        # Try direct parse
        try:
            possible_json = json.loads(content)
            if isinstance(possible_json, dict) and "status" in possible_json and possible_json["status"] == "READY":
                json_payload = possible_json
        except json.JSONDecodeError:
            # Check for markdown code block
            if "```json" in content:
                try:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                    possible_json = json.loads(json_str)
                    if isinstance(possible_json, dict) and "status" in possible_json and possible_json["status"] == "READY":
                        json_payload = possible_json
                except:
                    pass
            elif "```" in content:
                 try:
                    json_str = content.split("```")[1].split("```")[0].strip()
                    possible_json = json.loads(json_str)
                    if isinstance(possible_json, dict) and "status" in possible_json and possible_json["status"] == "READY":
                        json_payload = possible_json
                 except:
                    pass

        if json_payload:
            return {
                "type": "action",
                "payload": json_payload
            }
        else:
            return {
                "type": "message",
                "content": content
            }

    except Exception as e:
        return {"type": "error", "content": f"Error communicating with AI: {str(e)}"}
