import os
import json
from mistralai import Mistral

def analyze_comparison(features1, features2, label1, label2, api_key, language="en"):
    """
    Sends the metrics to Mistral AI for a comparative analysis.
    
    Args:
        features1 (dict): Metrics for circuit 1.
        features2 (dict): Metrics for circuit 2.
        label1 (str): Name of circuit 1.
        label2 (str): Name of circuit 2.
        api_key (str): Mistral API Key.
        language (str): Language code ("en" or "fr").
        
    Returns:
        dict: The parsed JSON analysis from the AI, or a dict with error/raw_text keys.
    """
    if not api_key:
        return {"error": "API Key is missing."}

    client = Mistral(api_key=api_key)

    # Prepare data for prompt
    data = {
        label1: features1,
        label2: features2
    }
    
    # Load System Prompt
    try:
        with open("system_prompt.md", "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        return {"error": "system_prompt.md not found."}

    # Add language instruction
    lang_instruction = ""
    if language == "fr":
        lang_instruction = "\n\nIMPORTANT: Please provide the analysis content in FRENCH. Keep the JSON keys in English as specified, but all values, descriptions, and summaries must be in French."
    else:
        lang_instruction = "\n\nIMPORTANT: Please provide the analysis content in English."

    user_message = f"Here is the data:\n{json.dumps(data, indent=2)}{lang_instruction}"

    try:
        chat_response = client.chat.complete(
            model="mistral-large-latest",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_message,
                },
            ],
            response_format={"type": "json_object"} # Force JSON mode if available/supported, otherwise rely on prompt
        )
        
        content = chat_response.choices[0].message.content
        
        # Try to parse JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Fallback if AI wraps code in markdown blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
                try:
                    return json.loads(content)
                except:
                    pass
            return {"raw_text": content, "error": "Failed to parse JSON response."}

    except Exception as e:
        return {"error": f"Error communicating with Mistral AI: {e}"}
