import os
import json
import pandas as pd
import io
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
    # Updated to look in the same directory as this script
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(current_dir, "system_prompt.md")
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        return {"error": f"system_prompt.md not found at {prompt_path}."}

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

def analyze_binding_ai(target_data, reference_data, api_key):
    """
    Analyzes binding using Mistral AI based on target and reference data.
    """
    if not api_key:
        return {"error": "API Key is missing."}

    client = Mistral(api_key=api_key)

    # Load System Prompt
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(current_dir, "binding_prompt.md")
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        return {"error": f"binding_prompt.md not found at {prompt_path}."}

    # Prepare Data Payload
    payload = {
        "reference_model": reference_data,
        "new_session_data": target_data
    }
    
    user_message = f"Analyze the following data for binding detection:\n\n{json.dumps(payload, indent=2)}"

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
            response_format={"type": "json_object"}
        )
        
        content = chat_response.choices[0].message.content
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
                try:
                    return json.loads(content)
                except:
                    pass
            return {"raw_text": content, "error": "Failed to parse JSON response."}

    except Exception as e:
        return {"error": f"Error communicating with Mistral AI: {e}"}

def analyze_voice_command(text, api_key):
    """
    Parses a voice transcript into structured session data using Mistral AI.
    
    Args:
        text (str): The transcribed text from the user.
        api_key (str): Mistral API Key.
        
    Returns:
        dict: The parsed JSON session data, or a dict with error.
    """
    if not api_key:
        return {"error": "API Key is missing."}

    client = Mistral(api_key=api_key)

    # Load System Prompt
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(current_dir, "voice_prompt.md")
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        return {"error": f"voice_prompt.md not found at {prompt_path}."}

    # Add current date context
    from datetime import datetime
    today_str = datetime.now().strftime("%Y-%m-%d")
    user_message = f"Today's date is {today_str}.\n\nUser Input: \"{text}\""

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
            response_format={"type": "json_object"}
        )
        
        content = chat_response.choices[0].message.content
        
        # Try to parse JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
                try:
                    return json.loads(content)
                except:
                    pass
            return {"raw_text": content, "error": "Failed to parse JSON response."}

    except Exception as e:
        return {"error": f"Error communicating with Mistral AI: {e}"}

def analyze_lap_comparison(csv_content_1, csv_content_2, filename1, filename2, api_key):
    """
    Analyzes and compares two karting sessions using the specific lap comparison prompt.
    """
    if not api_key:
        return {"error": "API Key is missing."}

    client = Mistral(api_key=api_key)

    # Load System Prompt
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(current_dir, "lap_compare_propt.md")
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        return {"error": f"lap_compare_propt.md not found at {prompt_path}."}

    # Prepare user message
    
    def process_csv_smart(content, filename):
        """
        Smart processing of CSV data to fit context window while preserving 'all lines' of the most critical data.
        Strategy:
        1. Parse CSV with Pandas.
        2. Identify Laps.
        3. Generate a 'Session Summary' (Lap times, consistency).
        4. Extract the BEST LAP (Fastest) in full resolution (all lines).
        5. If no laps found, use smart downsampling.
        """
        try:
            # Read CSV
            df = pd.read_csv(io.StringIO(content))
            
            # Clean columns
            df.columns = [c.strip() for c in df.columns]
            
            # Check for 'Lap' column (case insensitive)
            lap_col = next((c for c in df.columns if c.lower() == 'lap'), None)
            time_col = next((c for c in df.columns if 'time' in c.lower()), None)
            
            if lap_col and time_col:
                # Group by Lap
                laps = df.groupby(lap_col)
                lap_summaries = []
                best_lap_idx = -1
                min_time = float('inf')
                
                # Analyze Laps
                for lap_idx, lap_data in laps:
                    if len(lap_data) < 10: continue # Skip noise
                    
                    # Calculate duration
                    start_time = lap_data[time_col].min()
                    end_time = lap_data[time_col].max()
                    duration = end_time - start_time
                    
                    if duration < 10: continue # Skip incomplete/out laps
                    
                    lap_summaries.append(f"Lap {lap_idx}: {duration:.3f}s")
                    
                    if duration < min_time:
                        min_time = duration
                        best_lap_idx = lap_idx
                
                # Extract Best Lap Data (Full Resolution)
                if best_lap_idx != -1:
                    best_lap_df = df[df[lap_col] == best_lap_idx]
                    best_lap_csv = best_lap_df.to_csv(index=False)
                    
                    summary_text = ", ".join(lap_summaries)
                    
                    return (
                        f"### DATA STRUCTURE: BEST LAP + SESSION SUMMARY\n"
                        f"NOTE: To respect context limits while analyzing 'all lines', we have extracted the FASTEST LAP (Lap {best_lap_idx}) in full 50Hz/10Hz resolution.\n"
                        f"This allows you to see every braking point and apex detail for the optimal performance.\n\n"
                        f"--- SESSION SUMMARY (Consistency) ---\n"
                        f"{summary_text}\n\n"
                        f"--- BEST LAP TELEMETRY (Full Resolution) ---\n"
                        f"{best_lap_csv}"
                    )
            
            # Fallback: Smart Downsampling if no laps detected or extraction failed
            # Target ~500 lines max for non-lap data
            if len(df) > 500:
                step = len(df) // 500
                df_sampled = df.iloc[::step]
                return f"### DATA STRUCTURE: DOWNSAMPLED WHOLE SESSION\n{df_sampled.to_csv(index=False)}"
            
            return content

        except Exception as e:
            return f"Error processing CSV: {e}\nRaw Data Sample:\n{content[:1000]}..."

    csv1_processed = process_csv_smart(csv_content_1, filename1)
    csv2_processed = process_csv_smart(csv_content_2, filename2)

    user_message = f"""
Please analyze the following two karting sessions.

--- SESSION 1: {filename1} ---
{csv1_processed}

--- SESSION 2: {filename2} ---
{csv2_processed}
"""

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
            ]
        )
        
        content = chat_response.choices[0].message.content
        return {"analysis": content}

    except Exception as e:
        return {"error": f"Error communicating with Mistral AI: {e}"}
