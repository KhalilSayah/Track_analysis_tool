import numpy as np

def compute_circuit_characteristics(df):
    """
    Computes circuit characteristics based on telemetry data.
    
    Args:
        df (pd.DataFrame): Dataframe containing 'Time', 'GPS Speed', 'GPS LonAcc', 'GPS LatAcc'.
        
    Returns:
        dict: Dictionary containing computed features.
    """
    # Extract arrays
    try:
        # Flexible column checking
        if 'Time' not in df.columns:
             # Try to find a column that looks like Time
             time_col = [c for c in df.columns if 'Time' in c]
             if time_col:
                 df['Time'] = df[time_col[0]]
        
        time = df['Time'].values
        speed_kmh = df['GPS Speed'].values
        lon_acc_g = df['GPS LonAcc'].values
        lat_acc_g = df['GPS LatAcc'].values
    except KeyError as e:
        # Return empty/default if critical columns missing
        return {
            'Downforce': 0.0,
            'Braking': 0.0,
            'Tyre Wear': 0.0,
            'Mechanical Grip': 0.0,
            'Engine': 0.0,
            'track_path': []
        }

    # Conversions
    speed = speed_kmh / 3.6  # km/h -> m/s
    ax = lon_acc_g * 9.81    # g -> m/s^2
    ay = lat_acc_g * 9.81    # g -> m/s^2

    if len(time) < 2:
        return {}

    # Time step
    dt = np.mean(np.diff(time))
    lap_time = time[-1] - time[0]

    # Boolean masks
    is_braking = ax < -0.8
    is_accel = ax > 0.3
    is_corner = np.abs(ay) > 2.0
    
    # 1. Downforce Demand
    downforce = np.sum(np.abs(ay) * speed**2 * dt) / lap_time if lap_time > 0 else 0

    # 2. Brake Intensity
    if np.any(is_braking):
        brake_intensity = np.mean(np.abs(ax[is_braking]))
    else:
        brake_intensity = 0.0

    # 3. Tyre Wear Demand
    tyre_wear = np.sum(np.abs(ay) * speed * dt)

    # 4. Mechanical Grip (low speed)
    low_speed = speed < 22  # m/s (~79 km/h)
    mechanical_grip = np.sum(np.abs(ay[low_speed & is_corner]) * dt)

    # 5. Engine Importance
    engine_importance = np.sum(is_accel * dt) / lap_time if lap_time > 0 else 0

    # 6. Track Path (Downsampled)
    track_path = []
    if 'GPS Latitude' in df.columns and 'GPS Longitude' in df.columns:
        lat = df['GPS Latitude'].values
        lon = df['GPS Longitude'].values
        
        if len(lat) > 0:
            lat0 = lat[0]
            lon0 = lon[0]
            
            y_m = (lat - lat0) * 111132.92
            x_m = (lon - lon0) * 111412.84 * np.cos(np.deg2rad(lat0))
            
            # Downsample (take 200 points max for UI performance)
            step = max(1, len(x_m) // 200)
            
            for i in range(0, len(x_m), step):
                track_path.append({"x": float(x_m[i]), "y": float(y_m[i])})

    features = {
        'Downforce': float(downforce),
        'Braking': float(brake_intensity),
        'Tyre Wear': float(tyre_wear),
        'Mechanical Grip': float(mechanical_grip),
        'Engine': float(engine_importance),
        'track_path': track_path
    }

    return features

def parse_lap_time(t_str):
    """Parses 'mm:ss.ms' or 'm:ss.ms' to seconds."""
    try:
        parts = t_str.split(':')
        if len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        return float(t_str)
    except:
        return 0.0

def compute_lap_metrics(df, metadata=None):
    """
    Computes lap metrics from telemetry data.
    
    Args:
        df (pd.DataFrame): Dataframe containing 'Time', 'GPS Latitude', 'GPS Longitude'.
        metadata (dict): Optional metadata extracted from CSV header.
        
    Returns:
        dict: Dictionary containing lap metrics.
    """
    # 1. Try to use Metadata (Segment Times) first - Most Accurate
    if metadata and "Segment Times" in metadata:
        lap_strs = metadata["Segment Times"]
        # Parse and filter invalid
        laps = [parse_lap_time(s) for s in lap_strs]
        laps = [l for l in laps if l > 0]
        
        # Filter very short laps (e.g. in-lap/out-lap fragments < 20s)
        valid_laps = [l for l in laps if l > 20]
        
        if valid_laps:
            best_lap = min(valid_laps)
            avg_lap = float(np.mean(valid_laps))
            std_dev = float(np.std(valid_laps))
            
            return {
                "laps": valid_laps,
                "best_lap": best_lap,
                "average_lap": avg_lap,
                "regularity": std_dev,
                "theoretical_lap": best_lap # Fallback as we don't have sectors
            }

    # 2. Fallback to GPS Analysis
    if 'GPS Latitude' not in df.columns or 'GPS Longitude' not in df.columns:
        return {
            "laps": [],
            "best_lap": 0,
            "average_lap": 0,
            "regularity": 0,
            "theoretical_lap": 0
        }
    
    lat = df['GPS Latitude'].values
    lon = df['GPS Longitude'].values
    time = df['Time'].values
    
    if len(lat) == 0:
        return {
            "laps": [],
            "best_lap": 0,
            "average_lap": 0,
            "regularity": 0,
            "theoretical_lap": 0
        }

    start_lat = lat[0]
    start_lon = lon[0]
    
    # Calculate distance to start for all points (approximate)
    d_lat = (lat - start_lat) * 111132.92
    d_lon = (lon - start_lon) * 111412.84 * np.cos(np.deg2rad(start_lat))
    dist_sq = d_lat**2 + d_lon**2
    
    # Thresholds
    CROSSING_THRESHOLD_SQ = 20**2 # 20 meters squared
    
    # Find indices where car is close to start
    close_indices = np.where(dist_sq < CROSSING_THRESHOLD_SQ)[0]
    
    if len(close_indices) == 0:
         total_time = time[-1] - time[0]
         return {
            "laps": [total_time],
            "best_lap": total_time,
            "average_lap": total_time,
            "regularity": 0,
            "theoretical_lap": total_time
        }

    # Filter close indices to find distinct crossings
    crossings = []
    crossings.append(0)
    
    last_idx = close_indices[0]
    current_cluster = [last_idx]
    
    for idx in close_indices[1:]:
        if idx - last_idx > 200: # Gap > 200 samples
            best_in_cluster = current_cluster[np.argmin(dist_sq[current_cluster])]
            if best_in_cluster != 0:
                crossings.append(best_in_cluster)
            current_cluster = []
        
        current_cluster.append(idx)
        last_idx = idx
        
    if current_cluster:
        best_in_cluster = current_cluster[np.argmin(dist_sq[current_cluster])]
        if best_in_cluster != 0:
            crossings.append(best_in_cluster)

    # Calculate lap times
    lap_times = []
    for i in range(len(crossings) - 1):
        t_start = time[crossings[i]]
        t_end = time[crossings[i+1]]
        l_time = t_end - t_start
        if l_time > 20: 
            lap_times.append(float(l_time))
            
    if not lap_times:
         total_time = float(time[-1] - time[0])
         return {
            "laps": [total_time],
            "best_lap": total_time,
            "average_lap": total_time,
            "regularity": 0,
            "theoretical_lap": total_time
        }
         
    best_lap = min(lap_times)
    avg_lap = float(np.mean(lap_times))
    std_dev = float(np.std(lap_times))
    theoretical_lap = avg_lap - 2 * std_dev
    
    return {
        "laps": lap_times,
        "best_lap": best_lap,
        "average_lap": avg_lap,
        "regularity": std_dev,
        "theoretical_lap": theoretical_lap
    }
