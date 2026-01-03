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
    # Handle cases where columns might be missing or named differently slightly, 
    # but based on the notebook, these are the standard AiM names.
    try:
        time = df['Time'].values
        speed_kmh = df['GPS Speed'].values
        lon_acc_g = df['GPS LonAcc'].values
        lat_acc_g = df['GPS LatAcc'].values
    except KeyError as e:
        raise KeyError(f"Missing required column: {e}. Ensure the CSV is from AiM Race Studio.")

    # Conversions
    speed = speed_kmh / 3.6  # km/h -> m/s
    ax = lon_acc_g * 9.81    # g -> m/s^2
    ay = lat_acc_g * 9.81    # g -> m/s^2

    # Time step
    dt = np.mean(np.diff(time))
    lap_time = time[-1] - time[0]

    # Boolean masks
    is_braking = ax < -0.8
    is_accel = ax > 0.3
    is_corner = np.abs(ay) > 2.0
    
    # 1. Downforce Demand
    # Sum of absolute lateral acceleration * speed^2 * dt / Lap Time
    downforce = np.sum(np.abs(ay) * speed**2 * dt) / lap_time

    # 2. Brake Intensity
    # Mean absolute longitudinal acceleration during braking
    if np.any(is_braking):
        brake_intensity = np.mean(np.abs(ax[is_braking]))
    else:
        brake_intensity = 0.0

    # 3. Tyre Wear Demand
    # Sum of absolute lateral acceleration * speed * dt
    tyre_wear = np.sum(np.abs(ay) * speed * dt)

    # 4. Mechanical Grip (low speed)
    # Sum of absolute lateral acceleration in slow corners
    low_speed = speed < 22  # m/s (~79 km/h)
    mechanical_grip = np.sum(np.abs(ay[low_speed & is_corner]) * dt)

    # 5. Engine Importance
    # Percentage of lap time spent accelerating
    engine_importance = np.sum(is_accel * dt) / lap_time

    features = {
        'Downforce': downforce,
        'Braking': brake_intensity,
        'Tyre Wear': tyre_wear,
        'Mechanical Grip': mechanical_grip,
        'Engine': engine_importance
    }

    return features
