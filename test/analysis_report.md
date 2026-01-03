# Karting Circuit Comparative Analysis Report

**Date:** 2026-01-03

## 1. Executive Summary / Résumé Exécutif

- Circuit 1 is a technical, tyre-degrading track where precision and mechanical grip are paramount. Setup should prioritize rotation, traction, and tyre preservation.
- Circuit 2 is a high-speed, flowing circuit where downforce and stability dominate. Setup should focus on aerodynamic efficiency and smooth cornering.

## 2. Visual Analysis / Analyse Visuelle

### Track Layouts / Tracés

![Circuit 1](track_layout_1.png) ![Circuit 2](track_layout_2.png)

### Performance Radar / Comparaison Radar

![Radar Comparison](radar_comparison.png)

## 3. Key Metrics / Métriques Clés

| Metric | Circuit 1 | Circuit 2 |
| :--- | :---: | :---: |
| Downforce | 3752.06 | 4457.40 |
| Braking | 5.02 | 4.59 |
| Tyre Wear | 195065.16 | 102744.29 |
| Mechanical Grip | 6887.11 | 2525.80 |
| Engine | 0.52 | 0.53 |

## 4. AI Detailed Analysis / Analyse Détaillée IA

### Key Metric Differences
- **Downforce Demand**: +705.34 (18.8% higher in Circuit 2)
  - *Interpretation*: Circuit 2 has significantly higher downforce demand, indicating more fast, flowing corners where aerodynamic grip is critical. Circuit 1 is less reliant on high-speed stability.
- **Braking Intensity**: +0.43 (9.4% higher in Circuit 1)
  - *Interpretation*: Circuit 1 features harder braking zones, suggesting more stop-and-go characteristics with aggressive deceleration points. Circuit 2 has slightly smoother braking demands.
- **Tyre Wear Demand**: +92320.87 (90% higher in Circuit 1)
  - *Interpretation*: Circuit 1 is far more demanding on tyres, with high degradation likely due to long, loaded corners or abrasive surfaces. Circuit 2 is gentler on tyres.
- **Mechanical Grip (Low Speed)**: +4361.31 (173% higher in Circuit 1)
  - *Interpretation*: Circuit 1 requires significantly more mechanical grip in slow corners, indicating a technical, twisty layout. Circuit 2 is less dependent on low-speed traction.
- **Engine Importance**: +0.011 (2.1% higher in Circuit 2)
  - *Interpretation*: Both circuits have similar engine demands, but Circuit 2 spends slightly more time accelerating, likely due to longer straights or fewer slow corners.

### Defining Characteristics
**Circuit 1**:
- High tyre wear (degradation-sensitive)
- Technical, twisty with slow corners (mechanical grip critical)
- Aggressive braking zones (stop-and-go)
- Less reliant on high-speed stability

**Circuit 2**:
- Fast, flowing corners (downforce-dependent)
- Lower tyre wear (gentler on tyres)
- Smoother braking demands
- Slightly more power-sensitive (longer acceleration phases)

### Driving Style Implications
#### Circuit 1 (Precision and Tyre Management)
- Prioritize smooth inputs to preserve tyres, especially in long loaded corners.
- Focus on mechanical grip in slow corners—minimize wheelspin and maximize exit traction.
- Brake aggressively but precisely; trail-braking can help rotate the kart in tight sections.
- Avoid overdriving; consistency is key due to high tyre degradation.

#### Circuit 2 (High-Speed Flow and Stability)
- Carry momentum through fast corners; smooth steering and throttle inputs are critical.
- Minimize mid-corner corrections to maintain aerodynamic stability.
- Use braking zones to set up for flowing sequences rather than hard deceleration.
- Lift slightly earlier in high-speed corners to avoid unsettling the kart.

### Setup Recommendations
| Component | Circuit 1 | Circuit 2 |
| :--- | :--- | :--- |
| Chassis | Softer rear torsion bar or stiffer front end to improve rotation in slow corners. Consider higher ride height to avoid bottoming out in compression zones. | Stiffer rear torsion bar and lower ride height to maximize aerodynamic efficiency and reduce pitch sensitivity. |
| Gearing | Shorter gearing to improve acceleration out of slow corners and reduce wheelspin. | Taller gearing to optimize top speed on long straights while maintaining mid-range acceleration. |
| Tyre Pressures | Slightly higher pressures (0.1-0.2 psi) to reduce tyre deformation and wear, but monitor for overheating. | Lower pressures (0.1-0.2 psi) to increase contact patch and grip in fast corners, but avoid blistering. |
| Brake Bias | More rear bias to aid rotation, but ensure front brakes are strong enough for hard braking zones. | Balanced or slightly front-biased to ensure stability under braking into high-speed corners. |
| Differential | Tighter differential to improve traction out of slow corners, but avoid excessive lockup. | Looser differential to improve high-speed stability and reduce understeer in fast corners. |

## 5. Methodology & Definitions / Méthodologie



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
