import pandas as pd
import numpy as np
from scipy.signal import savgol_filter
from scipy.spatial import KDTree
from scipy.stats import linregress
import math

def lat_lon_to_xy(lat, lon, origin=None):
    R = 6378137.0 # Earth radius in meters

    if origin is None:
        lat0 = lat[0]
        lon0 = lon[0]
        origin = (lat0, lon0)
    else:
        lat0, lon0 = origin

    dlat = np.radians(lat - lat0)
    dlon = np.radians(lon - lon0)
    
    mean_lat = np.radians(lat0) 
    
    x = R * dlon * np.cos(mean_lat)
    y = R * dlat
    
    return x, y, origin

def calculate_boundaries(x, y, width=8.0):
    dx = np.gradient(x)
    dy = np.gradient(y)
    
    norm = np.sqrt(dx**2 + dy**2)
    norm[norm == 0] = 1.0
    dx_norm = dx / norm
    dy_norm = dy / norm
    
    nx = -dy_norm
    ny = dx_norm
    
    half_width = width / 2.0
    
    x_left = x + nx * half_width
    y_left = y + ny * half_width
    
    x_right = x - nx * half_width
    y_right = y - ny * half_width
    
    return x_left, y_left, x_right, y_right

def calculate_curvature(x, y):
    dx = np.gradient(x)
    dy = np.gradient(y)
    ddx = np.gradient(dx)
    ddy = np.gradient(dy)
    numerator = np.abs(dx * ddy - dy * ddx)
    denominator = (dx**2 + dy**2)**1.5
    denominator[denominator < 1e-10] = 1e-10
    curvature = numerator / denominator
    return curvature

def _filter_segments(boolean_array, lengths, target_val, min_len, invert_action=False):
    arr = boolean_array.copy()
    padded = np.concatenate(([not target_val], arr == target_val, [not target_val]))
    diff = np.diff(padded.astype(int))
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    
    for start, end in zip(starts, ends):
        segment_len = np.sum(lengths[start:end])
        if segment_len < min_len:
            if invert_action:
                arr[start:end] = not target_val
            else:
                arr[start:end] = not target_val
    return arr

def analyze_binding(df, metadata):
    """
    Analyzes the full session to build a baseline track map and identify corners.
    """
    # Parse Beacon Markers
    beacons = []
    if "Beacon Markers" in metadata:
        raw_markers = metadata["Beacon Markers"]
        for m in raw_markers:
            try:
                val = float(str(m).strip().strip('"').strip("'"))
                beacons.append(val)
            except ValueError:
                continue
    
    if len(beacons) < 2:
        # Fallback if no beacons: use start and end of file
        beacons = [df['Time'].min(), df['Time'].max()]

    # Find fastest lap for baseline
    durations = np.diff(beacons)
    valid_indices = [i for i, d in enumerate(durations) if d > 30.0]
    
    if valid_indices:
        lap_idx = valid_indices[np.argmin(durations[valid_indices])]
        lap_number = lap_idx + 1
    else:
        lap_number = np.argmin(durations) + 1 if len(durations) > 0 else 1

    start_time = beacons[lap_number-1]
    end_time = beacons[lap_number] if lap_number < len(beacons) else df['Time'].max()
    
    lap_data = df[(df['Time'] >= start_time) & (df['Time'] < end_time)].copy()
    
    if lap_data.empty:
        # Fallback to entire dataframe if lap extraction fails
        lap_data = df.copy()

    lat = lap_data['GPS Latitude'].values
    lon = lap_data['GPS Longitude'].values
    
    x_raw, y_raw, origin = lat_lon_to_xy(lat, lon)
    
    window_len = 11
    poly_order = 3
    if len(x_raw) > window_len:
        x = savgol_filter(x_raw, window_len, poly_order)
        y = savgol_filter(y_raw, window_len, poly_order)
    else:
        x, y = x_raw, y_raw
        
    curvature = calculate_curvature(x, y)
    
    # Corner detection logic
    corner_threshold = 0.03
    seg_curvature = (curvature[:-1] + curvature[1:]) / 2
    # Pad to match length
    seg_curvature = np.append(seg_curvature, seg_curvature[-1]) 
    
    is_corner = seg_curvature >= corner_threshold
    
    seg_lengths = np.sqrt(np.diff(x, prepend=x[0])**2 + np.diff(y, prepend=y[0])**2)
    
    is_corner = _filter_segments(is_corner, seg_lengths, target_val=True, min_len=10.0)
    is_corner = _filter_segments(is_corner, seg_lengths, target_val=False, min_len=20.0, invert_action=True)
    
    width = 8.0
    x_left, y_left, x_right, y_right = calculate_boundaries(x, y, width)
    
    baseline = {
        'origin': origin,
        'x': x.tolist(),
        'y': y.tolist(),
        'x_left': x_left.tolist(),
        'y_left': y_left.tolist(),
        'x_right': x_right.tolist(),
        'y_right': y_right.tolist(),
        'is_corner': is_corner.tolist(),
        'width': width,
        'lap_number': int(lap_number),
        'beacons': beacons # Needed for selection analysis
    }
    
    return baseline

def analyze_binding_selection(df, baseline, click_x, click_y, search_radius=30.0):
    """
    Analyzes a specific track location across all laps.
    """
    if not baseline:
        raise ValueError("Baseline data required")
        
    bx = np.array(baseline['x'])
    by = np.array(baseline['y'])
    origin = tuple(baseline['origin'])
    beacons = baseline['beacons']
    
    # 1. Find nearest point on baseline
    tree = KDTree(np.column_stack((bx, by)))
    dist, nearest_idx = tree.query([click_x, click_y])
    
    # 2. Determine baseline window (not strictly used for logic, but good for visualization if needed)
    # The logic in track_analyzer.py focuses on finding the corresponding location on EACH lap.
    
    results = []
    
    # Iterate through all laps
    for i in range(len(beacons) - 1):
        lap_num = i + 1
        start_t = beacons[i]
        end_t = beacons[i+1]
        
        # Filter reasonable lap times (>30s)
        if (end_t - start_t) < 30.0:
            continue

        lap_data = df[(df['Time'] >= start_t) & (df['Time'] < end_t)].copy()
        if len(lap_data) < 10:
            continue
            
        lat = lap_data['GPS Latitude'].values
        lon = lap_data['GPS Longitude'].values
        
        # Convert to XY using baseline origin
        x, y, _ = lat_lon_to_xy(lat, lon, origin=origin)
        
        # Map lap points to baseline click location
        lap_tree = KDTree(np.column_stack((x, y)))
        l_dist, l_nearest_idx = lap_tree.query([click_x, click_y])
        
        # Skip if this lap is too far from the click point (e.g., pit lane or off track)
        if l_dist > 20.0: 
            continue

        # Search for Apex around this point on THIS lap
        # Calculate cumulative distance along this lap
        l_dists = np.sqrt(np.diff(x, prepend=x[0])**2 + np.diff(y, prepend=y[0])**2)
        l_cum_dists = np.cumsum(l_dists)
        
        l_center_dist = l_cum_dists[l_nearest_idx]
        l_min_dist = l_center_dist - search_radius
        l_max_dist = l_center_dist + search_radius
        
        mask = (l_cum_dists >= l_min_dist) & (l_cum_dists <= l_max_dist)
        indices = np.where(mask)[0]
        
        if len(indices) < 5:
            continue
            
        # Find Min Speed (Apex) in this window
        speed = lap_data['GPS Speed'].values if 'GPS Speed' in lap_data.columns else np.zeros_like(x)
        
        # Ensure indices are within bounds
        indices = indices[indices < len(speed)]
        if len(indices) == 0:
            continue
            
        segment_speeds = speed[indices]
        min_speed_idx_local = np.argmin(segment_speeds)
        apex_idx = indices[min_speed_idx_local]
        
        # Calculate features starting from Apex -> Exit (+20m)
        # Look ahead limit
        lookahead_limit = min(len(x), apex_idx + 400)
        sub_x = x[apex_idx:lookahead_limit]
        sub_y = y[apex_idx:lookahead_limit]
        
        if len(sub_x) < 2:
            continue
            
        sub_dists = np.sqrt(np.diff(sub_x)**2 + np.diff(sub_y)**2)
        sub_cum = np.cumsum(sub_dists)
        
        # Find index where distance >= 20m
        exit_indices_local = np.where(sub_cum >= 20.0)[0]
        
        if len(exit_indices_local) == 0:
            # Check if we ran out of track but almost reached it? 
            # Or just take the end
            exit_idx = len(x) - 1
        else:
            exit_idx = apex_idx + 1 + exit_indices_local[0]
            
        if exit_idx >= len(x):
            exit_idx = len(x) - 1
            
        # Extract Data Windows
        win_speed = speed[apex_idx:exit_idx+1]
        rpm = lap_data['RPM'].values if 'RPM' in lap_data.columns else np.zeros_like(x)
        win_rpm = rpm[apex_idx:exit_idx+1]
        time_arr = lap_data['Time'].values
        win_time = time_arr[apex_idx:exit_idx+1]
        lat_g = lap_data['GPS LatAcc'].values if 'GPS LatAcc' in lap_data.columns else np.zeros_like(x)
        win_lat_g = lat_g[apex_idx:exit_idx+1]
        
        if len(win_time) < 2:
            continue
        
        # Calculate Features
        # RPM Slope
        res_rpm = linregress(win_time, win_rpm)
        rpm_slope = res_rpm.slope if not np.isnan(res_rpm.slope) else 0.0
        
        # Speed Gain
        delta_v = win_speed[-1] - win_speed[0]
        time_to_deltav = win_time[-1] - win_time[0]
        
        # RPM-Speed Correlation
        rpm_speed_corr = 0.0
        if len(win_speed) > 2:
            # Check variance to avoid div by zero
            if np.std(win_rpm) > 0 and np.std(win_speed) > 0:
                c = np.corrcoef(win_rpm, win_speed)
                rpm_speed_corr = c[0,1] if not np.isnan(c[0,1]) else 0.0
            
        # Lat G Decay (on absolute values?) - track_analyzer uses abs(win_lat_g)
        res_latg = linregress(win_time, np.abs(win_lat_g))
        lat_g_decay = res_latg.slope if not np.isnan(res_latg.slope) else 0.0
        
        # Long Efficiency
        delta_rpm = win_rpm[-1] - win_rpm[0]
        long_efficiency = delta_v / delta_rpm if abs(delta_rpm) > 10 else 0.0
        
        # RPM Anomaly
        predicted_rpm = res_rpm.slope * win_time + res_rpm.intercept
        residuals = win_rpm - predicted_rpm
        is_rpm_anomaly = False
        if len(residuals) > 2:
            std = np.std(residuals)
            if std > 1e-6:
                z = (residuals - np.mean(residuals)) / std
                if np.any(np.abs(z) > 3.0):
                    is_rpm_anomaly = True
                    
        results.append({
            "lap": int(lap_num),
            "apex_speed": float(speed[apex_idx]),
            "rpm_slope": float(rpm_slope),
            "speed_gain": float(delta_v),
            "time_to_deltav": float(time_to_deltav),
            "rpm_speed_corr": float(rpm_speed_corr),
            "lat_g_decay": float(lat_g_decay),
            "long_efficiency": float(long_efficiency),
            "rpm_anomaly": bool(is_rpm_anomaly),
            "apex_x": float(x[apex_idx]),
            "apex_y": float(y[apex_idx])
        })
        
    return results

def analyze_reference_fastest_lap(df, metadata):
    """
    Analyzes the fastest lap of a reference session and extracts features for detected corners.
    """
    # 1. Parse Beacons & Find Fastest Lap
    beacons = []
    if "Beacon Markers" in metadata:
        raw_markers = metadata["Beacon Markers"]
        for m in raw_markers:
            try:
                val = float(str(m).strip().strip('"').strip("'"))
                beacons.append(val)
            except ValueError:
                continue
    
    if len(beacons) < 2:
        beacons = [df['Time'].min(), df['Time'].max()]

    durations = np.diff(beacons)
    valid_indices = [i for i, d in enumerate(durations) if d > 30.0]
    
    if not valid_indices:
        return {"error": "No valid laps found (>30s)"}
        
    fastest_lap_idx = valid_indices[np.argmin(durations[valid_indices])]
    lap_number = fastest_lap_idx + 1
    lap_time = durations[fastest_lap_idx]

    start_time = beacons[fastest_lap_idx]
    end_time = beacons[fastest_lap_idx+1]
    
    lap_data = df[(df['Time'] >= start_time) & (df['Time'] < end_time)].copy()
    
    if lap_data.empty:
        return {"error": "Fastest lap data is empty"}

    # 2. Geometry & Corner Detection
    lat = lap_data['GPS Latitude'].values
    lon = lap_data['GPS Longitude'].values
    
    x_raw, y_raw, origin = lat_lon_to_xy(lat, lon)
    
    window_len = 11
    poly_order = 3
    if len(x_raw) > window_len:
        x = savgol_filter(x_raw, window_len, poly_order)
        y = savgol_filter(y_raw, window_len, poly_order)
    else:
        x, y = x_raw, y_raw
        
    curvature = calculate_curvature(x, y)
    
    corner_threshold = 0.03
    seg_curvature = (curvature[:-1] + curvature[1:]) / 2
    seg_curvature = np.append(seg_curvature, seg_curvature[-1]) 
    
    is_corner = seg_curvature >= corner_threshold
    
    seg_lengths = np.sqrt(np.diff(x, prepend=x[0])**2 + np.diff(y, prepend=y[0])**2)
    
    is_corner = _filter_segments(is_corner, seg_lengths, target_val=True, min_len=10.0)
    is_corner = _filter_segments(is_corner, seg_lengths, target_val=False, min_len=20.0, invert_action=True)
    
    # 3. Extract Features per Corner
    corners_data = []
    
    padded = np.concatenate(([False], is_corner, [False]))
    diff = np.diff(padded.astype(int))
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    
    speed_arr = lap_data['GPS Speed'].values if 'GPS Speed' in lap_data.columns else np.zeros_like(x)
    rpm_arr = lap_data['RPM'].values if 'RPM' in lap_data.columns else np.zeros_like(x)
    time_arr = lap_data['Time'].values
    lat_g_arr = lap_data['GPS LatAcc'].values if 'GPS LatAcc' in lap_data.columns else np.zeros_like(x)

    for i, (start, end) in enumerate(zip(starts, ends)):
        # Corner indices in lap_data
        indices = np.arange(start, end)
        
        if len(indices) < 3:
            continue
            
        # Find Apex (Min Speed) within this corner segment
        segment_speeds = speed_arr[indices]
        min_speed_idx_local = np.argmin(segment_speeds)
        apex_idx = indices[min_speed_idx_local]
        
        # Analyze from Apex -> Exit (+20m or reasonable distance)
        # Look ahead
        lookahead_limit = min(len(x), apex_idx + 400)
        sub_x = x[apex_idx:lookahead_limit]
        sub_y = y[apex_idx:lookahead_limit]
        
        sub_dists = np.sqrt(np.diff(sub_x)**2 + np.diff(sub_y)**2)
        sub_cum = np.cumsum(sub_dists)
        
        exit_indices_local = np.where(sub_cum >= 20.0)[0]
        
        if len(exit_indices_local) == 0:
            exit_idx = len(x) - 1
        else:
            exit_idx = apex_idx + 1 + exit_indices_local[0]
            
        if exit_idx >= len(x):
            exit_idx = len(x) - 1
            
        # Extract Windows
        win_speed = speed_arr[apex_idx:exit_idx+1]
        win_rpm = rpm_arr[apex_idx:exit_idx+1]
        win_time = time_arr[apex_idx:exit_idx+1]
        win_lat_g = lat_g_arr[apex_idx:exit_idx+1]
        
        if len(win_time) < 2:
            continue
            
        # Calculate Metrics
        # RPM Slope
        res_rpm = linregress(win_time, win_rpm)
        rpm_slope = res_rpm.slope if not np.isnan(res_rpm.slope) else 0.0
        
        # Speed Gain
        delta_v = win_speed[-1] - win_speed[0]
        time_to_deltav = win_time[-1] - win_time[0]
        
        # RPM-Speed Corr
        rpm_speed_corr = 0.0
        if np.std(win_rpm) > 0 and np.std(win_speed) > 0:
            c = np.corrcoef(win_rpm, win_speed)
            rpm_speed_corr = c[0,1] if not np.isnan(c[0,1]) else 0.0
            
        # Lat G Decay
        res_latg = linregress(win_time, np.abs(win_lat_g))
        lat_g_decay = res_latg.slope if not np.isnan(res_latg.slope) else 0.0
        
        # Long Efficiency
        delta_rpm = win_rpm[-1] - win_rpm[0]
        long_efficiency = delta_v / delta_rpm if abs(delta_rpm) > 10 else 0.0
        
        # RPM Anomaly
        predicted_rpm = res_rpm.slope * win_time + res_rpm.intercept
        residuals = win_rpm - predicted_rpm
        is_rpm_anomaly = False
        if len(residuals) > 2:
            std = np.std(residuals)
            if std > 1e-6:
                z = (residuals - np.mean(residuals)) / std
                if np.any(np.abs(z) > 3.0):
                    is_rpm_anomaly = True
                    
        corners_data.append({
            "corner_index": i + 1,
            "apex_speed": float(speed_arr[apex_idx]),
            "rpm_slope": float(rpm_slope),
            "speed_gain": float(delta_v),
            "time_to_deltav": float(time_to_deltav),
            "rpm_speed_corr": float(rpm_speed_corr),
            "lat_g_decay": float(lat_g_decay),
            "long_efficiency": float(long_efficiency),
            "rpm_anomaly": bool(is_rpm_anomaly),
            "apex_x": float(x[apex_idx]),
            "apex_y": float(y[apex_idx])
        })
        
    return {
        "lap_number": int(lap_number),
        "lap_time": float(lap_time),
        "corners": corners_data
    }
