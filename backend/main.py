from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
import pandas as pd
import numpy as np
from typing import List, Optional
import io
import traceback
import urllib.parse
from google.cloud import storage
import requests
import time
from pydantic import BaseModel

# Import core logic
from app.core.data_loader import load_csv
from app.core.analyzer import compute_circuit_characteristics, compute_lap_metrics
from app.core.ai_interpreter import analyze_comparison, analyze_voice_command, analyze_binding_ai, analyze_lap_comparison
from app.core.binding_analyzer import analyze_binding, analyze_binding_selection, analyze_reference_fastest_lap
from app.routers import budget

app = FastAPI(title="Karting Analysis Platform")

# Include Routers
app.include_router(budget.router, prefix="/api/v1/budget", tags=["budget"])

# CORS Configuration
# Allow frontend URL from env, defaulting to localhost for dev
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://www.birdsracing.com",
    "https://birdsracing.com",
    frontend_url,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# API Key (In production, use env vars)
# For this rebuild, we'll try to load from env, fallback to hardcoded (dev only)
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "9WzPqRnYfvFcH6Osj6KVQOIK1gPjNfrH")
# FIREBASE_BUCKET = "karting-65c6c.firebasestorage.app" 
FIREBASE_BUCKET = os.getenv("FIREBASE_BUCKET", "karting-65c6c.firebasestorage.app")

def get_gcs_client():
    # Try to load from environment variable (JSON string) first - useful for Render
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        try:
            from google.oauth2 import service_account
            creds_dict = json.loads(creds_json)
            credentials = service_account.Credentials.from_service_account_info(creds_dict)
            return storage.Client(credentials=credentials)
        except Exception as e:
            print(f"Error loading credentials from env: {e}")
            # Fallback to file if env loading fails
            
    # Fallback to local file
    try:
        return storage.Client.from_service_account_json("service-account-key.json")
    except Exception as e:
        print(f"Error loading credentials from file: {e}")
        # Last resort: default credentials (if running on GCP)
        return storage.Client()

@app.post("/api/v1/upload-session-gcs")
async def upload_session_gcs(
    file: UploadFile = File(...),
    track_id: str = Form(...),
    user_id: str = Form(...)
):
    try:
        # 1. Initialize Client
        storage_client = get_gcs_client()
        bucket = storage_client.bucket(FIREBASE_BUCKET)
        
        # 2. Define Path
        blob_name = f"sessions/{user_id}/{track_id}/{int(time.time())}_{file.filename}"
        blob = bucket.blob(blob_name)
        
        # 3. Upload content
        content = await file.read()
        blob.upload_from_string(
            content, 
            content_type=file.content_type or "application/octet-stream"
        )
        
        # 4. Make Public (Optional, or generate signed URL)
        # blob.make_public() # Be careful with this!
        
        # Generate Signed URL (valid for 1 hour, or longer if needed)
        # Note: Ideally, we want a permanent public URL if files are meant to be public
        # OR we generate signed URLs on demand.
        # For simplicity in this tool, let's assume we want a long-lived URL or public access.
        # If the bucket is private, we MUST generate a signed URL.
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=3600 * 24 * 7, # 7 days
            method="GET"
        )
        
        return {
            "name": blob_name,
            "bucket": FIREBASE_BUCKET,
            "url": url
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"GCS Upload Error: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Karting Analysis API is running"}

class AnalyzeMetricsRequest(BaseModel):
    urls: List[str]
    storage_paths: Optional[List[str]] = None
    labels: List[str] = []

class ProcessSessionRequest(BaseModel):
    file_url: str
    storage_path: Optional[str] = None

class SessionTelemetryRequest(BaseModel):
    file_url: str
    storage_path: Optional[str] = None
    columns: Optional[List[str]] = None
    max_points: Optional[int] = None

@app.post("/api/v1/sessions/process-csv")
async def process_session_csv(request: ProcessSessionRequest):
    try:
        # Download file using helper (handles URL + GCS fallback)
        file_obj = await download_file_content(request.file_url, request.storage_path)
        
        # Load Data
        try:
            df, metadata = load_csv(file_obj)
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=400, detail="Invalid CSV format")

        # Compute Metrics
        metrics = compute_lap_metrics(df, metadata)
        
        # Merge metadata into response
        response_data = {
            "metrics": metrics,
            "metadata": metadata
        }
        
        return response_data
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing session file: {str(e)}")

@app.post("/api/v1/sessions/telemetry")
async def get_session_telemetry(request: SessionTelemetryRequest):
    try:
        file_obj = await download_file_content(request.file_url, request.storage_path)
        try:
            df, metadata = load_csv(file_obj)
        except Exception:
            traceback.print_exc()
            raise HTTPException(status_code=400, detail="Invalid CSV format")

        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="No telemetry data found in file")

        time_col = "Time"
        if time_col not in df.columns:
            candidates = [c for c in df.columns if "time" in str(c)]
            if candidates:
                time_col = candidates[0]
            else:
                raise HTTPException(status_code=400, detail="No Time column found in telemetry data")

        time = df[time_col].values

        lap_indices = None
        lap_col = next((c for c in df.columns if str(c).lower() == "lap"), None)
        if lap_col:
            lap_series = df[lap_col].copy()
            lap_series = lap_series.fillna(method="ffill").fillna(method="bfill")
            try:
                lap_indices = lap_series.astype(int).values
            except Exception:
                lap_indices = np.ones(len(df), dtype=int)
        else:
            beacons = []
            if metadata and "Beacon Markers" in metadata:
                raw_markers = metadata["Beacon Markers"]
                for m in raw_markers:
                    try:
                        val = float(str(m).strip().strip('"').strip("'"))
                        beacons.append(val)
                    except ValueError:
                        continue
            if len(beacons) >= 2:
                lap_indices = np.zeros(len(df), dtype=int)
                for i in range(len(beacons) - 1):
                    start_t = beacons[i]
                    end_t = beacons[i + 1]
                    duration = end_t - start_t
                    if duration < 20.0:
                        continue
                    mask = (time >= start_t) & (time < end_t)
                    if np.any(mask):
                        lap_indices[mask] = i + 1
                if not np.any(lap_indices > 0):
                    lap_indices[:] = 1
            else:
                lap_indices = np.ones(len(df), dtype=int)

        x = None
        y = None
        if "GPS Latitude" in df.columns and "GPS Longitude" in df.columns:
            lat = df["GPS Latitude"].values
            lon = df["GPS Longitude"].values
            if len(lat) > 0:
                lat0 = lat[0]
                lon0 = lon[0]
                y_m = (lat - lat0) * 111132.92
                x_m = (lon - lon0) * 111412.84 * np.cos(np.deg2rad(lat0))
                x = x_m
                y = y_m

        if x is not None and y is not None:
            dx = np.diff(x, prepend=x[0])
            dy = np.diff(y, prepend=y[0])
            dists = np.sqrt(dx ** 2 + dy ** 2)
            distance = np.cumsum(dists)
        else:
            distance = time - time[0]

        lap_distance = np.zeros_like(distance)
        unique_laps = sorted(list(set(int(v) for v in lap_indices if int(v) > 0)))
        for lap in unique_laps:
            mask = lap_indices == lap
            if not np.any(mask):
                continue
            first_idx = np.argmax(mask)
            base = distance[first_idx]
            lap_distance[mask] = distance[mask] - base

        n = len(df)
        max_points = 2000
        if request.max_points and request.max_points > 0:
            max_points = max(100, min(int(request.max_points), 5000))
        step = max(1, n // max_points)
        indices = np.arange(0, n, step)

        df_sampled = df.iloc[indices]
        time_s = time[indices]
        lap_s = lap_indices[indices]
        dist_s = distance[indices]
        lap_dist_s = lap_distance[indices]
        x_s = x[indices] if x is not None else None
        y_s = y[indices] if y is not None else None

        numeric_cols = [c for c in df_sampled.columns if pd.api.types.is_numeric_dtype(df_sampled[c])]
        selected_cols = request.columns or numeric_cols
        selected_cols = [c for c in selected_cols if c in numeric_cols]

        samples = []
        for i in range(len(df_sampled)):
            row = df_sampled.iloc[i]
            sample = {
                "time": float(time_s[i]),
                "lap": int(lap_s[i]),
                "distance": float(dist_s[i]),
                "lap_distance": float(lap_dist_s[i]),
            }
            if x_s is not None and y_s is not None:
                sample["x"] = float(x_s[i])
                sample["y"] = float(y_s[i])
            for col in selected_cols:
                val = row[col]
                if pd.isna(val):
                    continue
                sample[str(col)] = float(val)
            samples.append(sample)

        lap_summary = []
        if len(unique_laps) > 0:
            for lap in unique_laps:
                mask = lap_indices == lap
                lap_times = time[mask]
                if len(lap_times) < 2:
                    continue
                lap_time = lap_times[-1] - lap_times[0]
                lap_summary.append({"lap": int(lap), "time": float(lap_time)})

        metrics = compute_lap_metrics(df, metadata)

        return {
            "lap_summary": lap_summary,
            "metrics": metrics,
            "columns": [str(c) for c in selected_cols],
            "samples": samples,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error extracting session telemetry: {str(e)}")

class AnalyzeAIRequest(BaseModel):
    features1: dict
    features2: dict
    label1: str
    label2: str
    language: str = "en"

class LapComparisonRequest(BaseModel):
    url1: str
    url2: str
    label1: str
    label2: str
    storage_path1: Optional[str] = None
    storage_path2: Optional[str] = None

@app.post("/api/v1/analyze/lap-comparison")
async def analyze_lap_comparison_endpoint(request: LapComparisonRequest):
    try:
        # Download files
        file_obj1 = await download_file_content(request.url1, request.storage_path1)
        file_obj2 = await download_file_content(request.url2, request.storage_path2)
        
        # Read content as string (assuming utf-8 or similar)
        # Note: AiM CSVs might have different encodings. load_csv handles it, but here we want raw text?
        # Or maybe we should use load_csv to clean it first?
        # The prompt says "AiM CSV files". Raw text is safer for the AI to interpret "metadata" if it's in header.
        # But we need to handle encoding.
        
        def read_file_content(f):
            try:
                return f.read().decode('utf-8')
            except UnicodeDecodeError:
                f.seek(0)
                return f.read().decode('latin-1')
        
        content1 = read_file_content(file_obj1)
        content2 = read_file_content(file_obj2)
        
        result = analyze_lap_comparison(
            content1,
            content2,
            request.label1,
            request.label2,
            MISTRAL_API_KEY
        )
        
        return result
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing lap comparison: {str(e)}")

@app.post("/api/v1/analyze/metrics")
async def analyze_metrics(request: AnalyzeMetricsRequest):
    if len(request.urls) != 2:
        raise HTTPException(status_code=400, detail="Exactly two file URLs are required.")
    
    results = []
    
    try:
        for idx, url in enumerate(request.urls):
            storage_path = request.storage_paths[idx] if request.storage_paths and idx < len(request.storage_paths) else None
            
            # Download file using helper (handles URL + GCS fallback)
            file_obj = await download_file_content(url, storage_path)
            
            # Load Data
            try:
                df, _ = load_csv(file_obj)
            except UnicodeDecodeError:
                file_obj.seek(0)
                df = pd.read_csv(file_obj, skiprows=range(0, 14), encoding='latin-1')
                df.columns = df.columns.str.strip()
                df = df.apply(pd.to_numeric, errors='coerce')

            # Compute Metrics (now includes track_path)
            feats = compute_circuit_characteristics(df)
            
            results.append({
                "features": feats,
                "label": request.labels[idx] if idx < len(request.labels) else f"Track {idx+1}"
            })
            
        return results
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing metrics: {str(e)}")

class VoiceCommandRequest(BaseModel):
    text: str

@app.post("/api/v1/analyze/voice-command")
async def process_voice_command(request: VoiceCommandRequest):
    try:
        result = analyze_voice_command(request.text, MISTRAL_API_KEY)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing voice command: {str(e)}")


@app.post("/api/v1/analyze/ai")
async def analyze_ai(request: AnalyzeAIRequest):
    try:
        # Strip track_path if present to save tokens and avoid errors
        f1 = request.features1.copy()
        f2 = request.features2.copy()
        f1.pop('track_path', None)
        f2.pop('track_path', None)

        ai_analysis = analyze_comparison(
            f1, 
            f2, 
            request.label1, 
            request.label2, 
            MISTRAL_API_KEY, 
            request.language
        )
        return ai_analysis
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Analysis Error: {str(e)}")

class BindingInitRequest(BaseModel):
    file_url: str
    storage_path: Optional[str] = None

class BindingCornerRequest(BaseModel):
    file_url: str
    storage_path: Optional[str] = None
    baseline: dict
    click_x: float
    click_y: float
    search_radius: float = 30.0

class ReferenceAnalysisRequest(BaseModel):
    file_url: str
    storage_path: Optional[str] = None

class BindingAIRequest(BaseModel):
    target_corner_data: List[dict]
    reference_corners: List[dict]
    click_x: float
    click_y: float

async def download_file_content(file_url: str, storage_path: Optional[str] = None) -> io.BytesIO:
    if storage_path:
        try:
            storage_client = get_gcs_client()
            bucket = storage_client.bucket(FIREBASE_BUCKET)
            blob = bucket.blob(storage_path)
            content = blob.download_as_bytes()
            return io.BytesIO(content)
        except Exception as e:
            print(f"GCS Download failed for {storage_path}: {e}")
            # Fallback to URL if GCS fails (though unlikely if path is correct)
    
    # URL Fallback
    response = requests.get(file_url)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to download file from {file_url}")
    return io.BytesIO(response.content)

@app.post("/api/v1/analyze/binding/init")
async def analyze_binding_init(request: BindingInitRequest):
    try:
        file_obj = await download_file_content(request.file_url, request.storage_path)
        
        # Load Data
        try:
            df, metadata = load_csv(file_obj)
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=400, detail="Invalid CSV format")

        # Analyze
        baseline = analyze_binding(df, metadata)
        return baseline
            
    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error initializing binding analysis: {str(e)}")

@app.post("/api/v1/analyze/binding/corner")
async def analyze_binding_corner(request: BindingCornerRequest):
    try:
        file_obj = await download_file_content(request.file_url, request.storage_path)
        
        # Load Data
        try:
            df, metadata = load_csv(file_obj)
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=400, detail="Invalid CSV format")

        # Analyze Corner
        results = analyze_binding_selection(
            df, 
            request.baseline, 
            request.click_x, 
            request.click_y, 
            request.search_radius
        )
        return results
            
    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing corner: {str(e)}")

@app.post("/api/v1/analyze/reference")
async def analyze_reference(request: ReferenceAnalysisRequest):
    try:
        file_obj = await download_file_content(request.file_url, request.storage_path)
        
        # Load Data
        try:
            df, metadata = load_csv(file_obj)
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=400, detail="Invalid CSV format")

        # Analyze Reference
        results = analyze_reference_fastest_lap(df, metadata)
        return results
            
    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing reference: {str(e)}")

@app.post("/api/v1/analyze/binding/ai")
async def analyze_binding_ai_endpoint(request: BindingAIRequest):
    try:
        # 1. Find Matching Reference Corner
        click_point = np.array([request.click_x, request.click_y])
        
        min_dist = float('inf')
        ref_corner = None
        
        for rc in request.reference_corners:
            rc_point = np.array([rc['apex_x'], rc['apex_y']])
            dist = np.linalg.norm(click_point - rc_point)
            if dist < min_dist:
                min_dist = dist
                ref_corner = rc
        
        # Threshold for valid match (e.g. 50m)
        if min_dist > 50.0 or ref_corner is None:
            return {"error": "No matching reference corner found near selection."}
            
        # 2. Format Reference Data (Prompt Key Mapping)
        reference_data = {
            "Corner_ID": ref_corner['corner_index'],
            "RPM_slope_ref": ref_corner['rpm_slope'],
            "Speed_gain_ref": ref_corner['speed_gain'],
            "Time_to_DeltaV_ref": ref_corner.get('time_to_deltav', 0.0), # Use .get for backward compatibility
            "RPM_vs_Speed_corr_ref": ref_corner.get('rpm_speed_corr', 0.0),
            "LatG_decay_ref": ref_corner['lat_g_decay'],
            "Longitudinal_efficiency_ref": ref_corner['long_efficiency']
        }
        
        # 3. Format Target Data (Prompt Key Mapping)
        target_data = []
        for lap in request.target_corner_data:
            target_data.append({
                "Lap": lap['lap'],
                "RPM_slope": lap['rpm_slope'],
                "Speed_gain": lap['speed_gain'],
                "Time_to_DeltaV": lap.get('time_to_deltav', 0.0),
                "RPM_vs_Speed_corr": lap.get('rpm_speed_corr', 0.0),
                "LatG_decay": lap['lat_g_decay'],
                "Longitudinal_efficiency": lap['long_efficiency']
            })
            
        # 4. Call AI
        result = analyze_binding_ai(target_data, reference_data, MISTRAL_API_KEY)
        return result
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error running AI analysis: {str(e)}")

