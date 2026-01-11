import pandas as pd
import numpy as np
import json
import os
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

def parse_beacon_markers(filepath):
    beacon_markers = []
    header_row_index = 0
    
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()
            
            for i, line in enumerate(lines):
                if "Beacon Markers" in line:
                    parts = line.strip().split(',')
                    beacon_markers = []
                    for p in parts:
                        clean_p = p.strip().strip('"').strip("'")
                        try:
                            val = float(clean_p)
                            beacon_markers.append(val)
                        except ValueError:
                            continue
                
                if "Time" in line and "GPS Speed" in line:
                    header_row_index = i
                    break
                    
    except Exception as e:
        print(f"Error parsing file: {e}")
        return [], 0

    return beacon_markers, header_row_index

class TrackAnalyzer:
    def __init__(self):
        self.baseline = {}
        self.df = None
        self.beacons = []
        self.header_idx = 0
        self.filepath = None
        
    def load_file(self, filepath):
        self.filepath = filepath
        self.beacons, self.header_idx = parse_beacon_markers(filepath)
        self.df = pd.read_csv(filepath, skiprows=self.header_idx)
        self.df.columns = [c.strip() for c in self.df.columns]
        
    def build_baseline(self, lap_number=None, width=8.0, corner_threshold=0.03):
        if self.df is None:
            raise ValueError("File not loaded")
            
        if lap_number is None:
            # Find fastest lap
            durations = np.diff(self.beacons)
            # Filter reasonable laps (> 30s)
            valid_indices = [i for i, d in enumerate(durations) if d > 30.0]
            if valid_indices:
                lap_idx = valid_indices[np.argmin(durations[valid_indices])]
                lap_number = lap_idx + 1
            else:
                lap_number = np.argmin(durations) + 1
        
        start_time = self.beacons[lap_number-1]
        end_time = self.beacons[lap_number]
        
        lap_data = self.df[(self.df['Time'] >= start_time) & (self.df['Time'] < end_time)].copy()
        
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
        seg_curvature = (curvature[:-1] + curvature[1:]) / 2
        is_corner = seg_curvature >= corner_threshold
        
        # Filter segments logic
        seg_lengths = np.sqrt(np.diff(x)**2 + np.diff(y)**2)
        is_corner = self._filter_segments(is_corner, seg_lengths, target_val=True, min_len=10.0)
        is_corner = self._filter_segments(is_corner, seg_lengths, target_val=False, min_len=20.0, invert_action=True)
        
        x_left, y_left, x_right, y_right = calculate_boundaries(x, y, width)
        
        self.baseline = {
            'origin': origin,
            'x': x.tolist(),
            'y': y.tolist(),
            'x_left': x_left.tolist(),
            'y_left': y_left.tolist(),
            'x_right': x_right.tolist(),
            'y_right': y_right.tolist(),
            'is_corner': is_corner.tolist(),
            'width': width,
            'lap_number': int(lap_number)
        }
        
        return self.baseline

    def _filter_segments(self, boolean_array, lengths, target_val, min_len, invert_action=False):
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

    def analyze_selection(self, click_x, click_y, search_radius=30.0):
        """
        Finds the nearest track point to click_x, click_y.
        Then searches for a local Apex (min speed) within a window around that point.
        Then calculates features for ALL laps at that corresponding location.
        """
        if not self.baseline:
            raise ValueError("Baseline not built")
            
        # 1. Find nearest point on baseline
        bx = np.array(self.baseline['x'])
        by = np.array(self.baseline['y'])
        tree = KDTree(np.column_stack((bx, by)))
        dist, nearest_idx = tree.query([click_x, click_y])
        
        # 2. Define search window for Apex (e.g., +/- 30 meters along track)
        # Simple index window for now (assuming ~0.1m per sample, 30m is ~300 samples)
        # Better: use cumulative distance
        dists = np.sqrt(np.diff(bx)**2 + np.diff(by)**2)
        cum_dists = np.concatenate(([0], np.cumsum(dists)))
        
        center_dist = cum_dists[nearest_idx]
        min_dist = center_dist - search_radius
        max_dist = center_dist + search_radius
        
        # Wrap around logic is complex, let's assume simple linear for now or simple window
        # If nearest_idx is near start/end, we might miss wrap-around
        
        window_indices = np.where((cum_dists >= min_dist) & (cum_dists <= max_dist))[0]
        if len(window_indices) == 0:
            window_indices = [nearest_idx]
            
        # Refine Apex search on the Baseline itself? 
        # Actually, apex is specific to each lap, but we want to analyze "this corner".
        # We should define the "Corner Zone" based on the baseline, and then find the apex for EACH lap in that zone.
        
        # So, we return the "Corner Definition" (start_dist, end_dist on baseline) to the caller?
        # Or we do the per-lap analysis here.
        
        results = []
        origin = tuple(self.baseline['origin'])
        
        for i in range(len(self.beacons) - 1):
            lap_num = i + 1
            start_t = self.beacons[i]
            end_t = self.beacons[i+1]
            
            lap_data = self.df[(self.df['Time'] >= start_t) & (self.df['Time'] < end_t)].copy()
            if len(lap_data) < 10:
                continue
                
            lat = lap_data['GPS Latitude'].values
            lon = lap_data['GPS Longitude'].values
            x, y, _ = lat_lon_to_xy(lat, lon, origin=origin)
            
            # Map lap points to baseline distance
            lap_tree = KDTree(np.column_stack((x, y)))
            
            # We want to find the segment of this lap that corresponds to the baseline window
            # Strategy: Find points on this lap that are close to the baseline window points
            # This is expensive. 
            
            # Better: Map every point of the lap to the baseline index
            # dists_to_base, base_indices = tree.query(np.column_stack((x, y)))
            
            # But we only need the local area.
            # Let's find the point on this lap nearest to the user click
            l_dist, l_nearest_idx = lap_tree.query([click_x, click_y])
            
            # Now search for Apex around this point on THIS lap
            # Search +/- 30 meters on this lap
            l_dists = np.sqrt(np.diff(x)**2 + np.diff(y)**2)
            l_cum_dists = np.concatenate(([0], np.cumsum(l_dists)))
            
            l_center_dist = l_cum_dists[l_nearest_idx]
            l_min_dist = l_center_dist - search_radius
            l_max_dist = l_center_dist + search_radius
            
            mask = (l_cum_dists >= l_min_dist) & (l_cum_dists <= l_max_dist)
            indices = np.where(mask)[0]
            
            if len(indices) < 5:
                continue
                
            # Find Min Speed (Apex) in this window
            speed = lap_data['GPS Speed'].values if 'GPS Speed' in lap_data.columns else np.zeros_like(x)
            
            # Check bounds
            indices = indices[indices < len(speed)]
            if len(indices) == 0:
                continue
                
            segment_speeds = speed[indices]
            min_speed_idx_local = np.argmin(segment_speeds)
            apex_idx = indices[min_speed_idx_local]
            
            # Now calculate features starting from this Apex
            # Exit point = Apex + 20m
            
            # Look ahead
            lookahead_limit = min(len(x), apex_idx + 400)
            sub_x = x[apex_idx:lookahead_limit]
            sub_y = y[apex_idx:lookahead_limit]
            
            if len(sub_x) < 2:
                continue
                
            sub_dists = np.sqrt(np.diff(sub_x)**2 + np.diff(sub_y)**2)
            sub_cum = np.cumsum(sub_dists)
            
            exit_idx_local = np.argmax(sub_cum >= 20.0)
            
            if sub_cum[exit_idx_local] < 20.0:
                 # Check end
                 if len(sub_cum) > 0 and sub_cum[-1] < 20.0:
                     # Not enough track
                     continue
                 if exit_idx_local == 0 and sub_cum[0] < 20.0:
                     if sub_cum[-1] >= 20.0:
                         pass
                     else:
                         continue

            exit_idx = apex_idx + 1 + exit_idx_local
            if exit_idx >= len(x):
                exit_idx = len(x) - 1
                
            # Extract Data
            win_speed = speed[apex_idx:exit_idx+1]
            rpm = lap_data['RPM'].values if 'RPM' in lap_data.columns else np.zeros_like(x)
            win_rpm = rpm[apex_idx:exit_idx+1]
            time = lap_data['Time'].values
            win_time = time[apex_idx:exit_idx+1]
            lat_g = lap_data['GPS LatAcc'].values if 'GPS LatAcc' in lap_data.columns else np.zeros_like(x)
            win_lat_g = lat_g[apex_idx:exit_idx+1]
            
            if len(win_time) < 2:
                continue
            
            # Features
            res_rpm = linregress(win_time, win_rpm)
            rpm_slope = res_rpm.slope if not np.isnan(res_rpm.slope) else 0.0
            
            delta_v = win_speed[-1] - win_speed[0]
            
            rpm_speed_corr = 0.0
            if len(win_speed) > 2:
                c = np.corrcoef(win_rpm, win_speed)
                rpm_speed_corr = c[0,1] if not np.isnan(c[0,1]) else 0.0
                
            res_latg = linregress(win_time, np.abs(win_lat_g))
            lat_g_decay = res_latg.slope if not np.isnan(res_latg.slope) else 0.0
            
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
                "lap": lap_num,
                "apex_speed": float(speed[apex_idx]),
                "rpm_slope": float(rpm_slope),
                "speed_gain": float(delta_v),
                "rpm_speed_corr": float(rpm_speed_corr),
                "lat_g_decay": float(lat_g_decay),
                "long_efficiency": float(long_efficiency),
                "rpm_anomaly": is_rpm_anomaly,
                "apex_x": float(x[apex_idx]),
                "apex_y": float(y[apex_idx])
            })
            
        return results
