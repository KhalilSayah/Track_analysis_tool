# Circuit Characteristics from Telemetry (AiM CSV)

## Overview
This feature analyzes karting track characteristics using telemetry data exported from AiM devices (CSV format). It computes key performance indicators related to vehicle dynamics and track demands, allowing for a quantitative comparison between different circuits.

The tool processes GPS speed, longitudinal acceleration (`GPS LonAcc`), and lateral acceleration (`GPS LatAcc`) to derive metrics such as Downforce Demand, Braking Intensity, Tyre Wear, Mechanical Grip, and Engine Importance. It also visualizes the track layout and generates a comparative radar chart.

## Input Data
The system expects CSV files exported from AiM Race Studio.
- **Format**: CSV
- **Preprocessing**: Skips the first 14 lines of metadata.
- **Key Columns Used**:
  - `Time`: Time in seconds.
  - `GPS Speed`: Speed in km/h (converted to m/s internally).
  - `GPS LonAcc`: Longitudinal Acceleration in g (converted to m/s²).
  - `GPS LatAcc`: Lateral Acceleration in g (converted to m/s²).

## Computed Metrics

The following characteristics are computed for each circuit:

### 1. Downforce Demand
*Represents how much the track relies on aerodynamic grip.*
- **Logic**: Sum of absolute lateral acceleration weighted by the square of speed.
- **Formula**: $\frac{\sum (|a_y| \cdot v^2 \cdot dt)}{Lap Time}$
- **Interpretation**: High values indicate fast corners where aerodynamic load is significant.

### 2. Braking Intensity
*Represents the severity of braking zones.*
- **Logic**: Average absolute longitudinal acceleration during braking events.
- **Threshold**: Braking is defined when `GPS LonAcc < -0.8 g`.
- **Formula**: $\text{mean}(|a_x|) \text{ where } a_x < -0.8g$
- **Interpretation**: Higher values indicate heavy braking zones (hard braking).

### 3. Tyre Wear Demand
*Represents the stress put on tyres.*
- **Logic**: Sum of absolute lateral acceleration weighted by speed.
- **Formula**: $\sum (|a_y| \cdot v \cdot dt)$
- **Interpretation**: High energy input into the tyres, correlating with degradation.

### 4. Mechanical Grip (Low Speed)
*Represents the importance of mechanical grip in slow corners.*
- **Logic**: Sum of absolute lateral acceleration in corners taken at low speed.
- **Thresholds**:
  - Speed < 22 m/s (~79 km/h)
  - Lateral Acc > 2.0 m/s² (~0.2g) (to filter straights)
- **Formula**: $\sum (|a_y| \cdot dt) \text{ where } v < 22 \text{ and } |a_y| > 2.0$
- **Interpretation**: Highlights tracks with many tight, slow corners where chassis setup for mechanical grip is crucial.

### 5. Engine Importance
*Represents the percentage of the lap spent accelerating.*
- **Logic**: Fraction of the lap time where the kart is accelerating significantly.
- **Threshold**: Acceleration is defined when `GPS LonAcc > 0.3 g`.
- **Formula**: $\frac{\sum (dt \text{ where } a_x > 0.3g)}{Lap Time}$
- **Interpretation**: Indicates tracks where engine power and drag reduction are critical.

## Visualizations

### Circuit Map (GPS)
Plots the track layout using `GPS Longitude` and `GPS Latitude` to verify the geometry of the circuit.

### Comparative Radar Chart (Z-Score)
Compares two circuits based on the five computed metrics.
- **Normalization**: Uses Z-score normalization to handle different units and scales.
  - $Z = \frac{x - \mu}{\sigma}$
  - Values are standardized relative to the mean and standard deviation of the two circuits being compared.
- **Output**: A polar plot showing the relative strengths of each circuit (e.g., Circuit A might be more "Braking" heavy, while Circuit B is more "Downforce" heavy).

## Usage
1. **Load Data**: Use `load_csv("path/to/file.csv")` to parse the telemetry file.
2. **Compute Features**: Call `compute(dataframe)` to get a dictionary of the 5 metrics.
3. **Visualize**:
   - `plot_track(dataframe, "Label")` for the map.
   - `plot_circuit_radar_zscore(features1, features2, labels=...)` for the comparison.
