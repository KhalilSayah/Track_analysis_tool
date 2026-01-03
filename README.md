# Karting Track Comparison Tool

This project is a sophisticated telemetry analysis tool designed for karting applications. It processes data exported from AiM devices (via Race Studio) to compute advanced circuit metrics, compare different tracks, and provide AI-driven setup and driving recommendations.

## 🏎️ Features

-   **Telemetry Analysis**: Imports CSV data from AiM Race Studio (skipping standard metadata headers).
-   **Advanced Metrics**: Computes 5 key performance indicators for each circuit:
    -   **Downforce Demand**: Aerodynamic load analysis based on high-speed cornering.
    -   **Braking Intensity**: Severity and frequency of heavy braking zones.
    -   **Tyre Wear Demand**: Energy input into the tyres.
    -   **Mechanical Grip**: Importance of chassis setup for low-speed corners.
    -   **Engine Importance**: Full-throttle time percentage.
-   **Visualizations**:
    -   **GPS Track Map**: Plots the circuit layout using longitude/latitude data.
    -   **Radar Chart**: Compares two circuits using Z-Score normalization to highlight relative differences.
-   **AI-Powered Insights**: Integrates **Mistral AI** to generate:
    -   Driving style adaptations (e.g., "Attack braking zones more aggressively").
    -   Kart setup recommendations (e.g., "Stiffen front torsion bar").
-   **PDF Reporting**: Generates a professional PDF report containing the analysis, charts, and AI recommendations.
-   **Multi-Language Support**: Fully localized in **English** and **French**.

## 🛠️ Installation

1.  **Clone the repository** (or extract the files).
2.  **Install dependencies**:
    Ensure you have Python installed, then run:
    ```bash
    pip install -r requirements.txt
    ```

## 🚀 Usage

1.  **Run the application**:
    ```bash
    streamlit run app.py
    ```
2.  **Upload Data**:
    -   Use the sidebar to upload two CSV files exported from AiM Race Studio.
    -   (Optional) Assign custom labels to each dataset (e.g., "Genk 2023" vs "Mariembourg 2024").
3.  **Analyze**:
    -   View the **Comparison** tab for side-by-side metrics and radar charts.
    -   View the **AI Analysis** tab for detailed text recommendations.
    -   Click **Generate PDF Report** to download a complete summary.

## 📂 Project Structure

-   `app.py`: The main entry point for the Streamlit application.
-   `src/`: Contains the core logic modules:
    -   `data_loader.py`: Handles CSV parsing and data cleaning.
    -   `analyzer.py`: Implements the physics formulas for metric calculation.
    -   `visualizer.py`: Generates Matplotlib plots (maps, radar charts).
    -   `ai_interpreter.py`: Interfaces with the Mistral AI API.
    -   `pdf_exporter.py`: Handles PDF generation using `fpdf2`.
    -   `translations.py`: Manages UI text for English/French support.
-   `test/`: Contains sample outputs and test files.

## ⚙️ Configuration

The application currently uses a Mistral API key for the AI analysis features.
*Note: Ensure you have a valid internet connection for the AI features to work.*

## 📊 Metric Definitions

-   **Downforce**: $\sum (|a_y| \cdot v^2 \cdot dt) / \text{Lap Time}$
-   **Braking**: Mean deceleration during heavy braking events ($< -0.8g$).
-   **Tyre Wear**: $\sum (|a_y| \cdot v \cdot dt)$
-   **Mechanical Grip**: Lateral forces in slow corners ($v < 22 m/s$).
-   **Engine**: % of lap spent at full throttle.

## 📝 License

[Your License Here]
