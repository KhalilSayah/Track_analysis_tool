import matplotlib.pyplot as plt
import pandas as pd
import tempfile
import os
import zipfile
import io

def save_fig_to_bytes(fig):
    """Saves a matplotlib figure to a bytes buffer."""
    buf = io.BytesIO()
    try:
        # Try with tight_layout
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    except ValueError:
        # Fallback if layout is too tight
        buf.seek(0)
        buf.truncate()
        fig.savefig(buf, format='png', dpi=150)
    buf.seek(0)
    return buf.read()

def generate_markdown_content(features1, features2, label1, label2, analysis_json, language="en"):
    """Generates the Markdown content for the report."""
    
    title = "Karting Circuit Comparative Analysis Report" if language == "en" else "Rapport d'Analyse Comparative de Circuits de Karting"
    
    md = f"# {title}\n\n"
    md += f"**Date:** {pd.Timestamp.now().strftime('%Y-%m-%d')}\n\n"
    
    # 1. Executive Summary (from AI)
    md += "## 1. Executive Summary / Résumé Exécutif\n\n"
    if analysis_json and "final_summary" in analysis_json:
        for item in analysis_json["final_summary"]:
            md += f"- {item}\n"
    md += "\n"

    # 2. Visual Analysis
    md += "## 2. Visual Analysis / Analyse Visuelle\n\n"
    md += "### Track Layouts / Tracés\n\n"
    md += f"| {label1} | {label2} |\n"
    md += "| :---: | :---: |\n"
    md += f"| ![{label1}](track_layout_1.png) | ![{label2}](track_layout_2.png) |\n\n"
    
    md += "### Performance Radar / Comparaison Radar\n\n"
    md += "![Radar Comparison](radar_comparison.png)\n\n"

    # 3. Metrics
    md += "## 3. Key Metrics / Métriques Clés\n\n"
    md += f"| Metric | {label1} | {label2} |\n"
    md += "| :--- | :---: | :---: |\n"
    for k, v1 in features1.items():
        v2 = features2.get(k, 0)
        md += f"| {k} | {v1:.2f} | {v2:.2f} |\n"
    md += "\n"

    # 4. Detailed AI Analysis
    if analysis_json:
        md += "## 4. AI Detailed Analysis / Analyse Détaillée IA\n\n"
        
        if "key_metric_differences" in analysis_json:
            md += "### Key Metric Differences\n"
            for item in analysis_json["key_metric_differences"]:
                md += f"- **{item.get('metric', '')}**: {item.get('difference', '')}\n"
                md += f"  - *Interpretation*: {item.get('interpretation', '')}\n"
            md += "\n"

        if "defining_characteristics" in analysis_json:
            md += "### Defining Characteristics\n"
            dc = analysis_json["defining_characteristics"]
            
            md += f"**{label1}**:\n"
            for t in dc.get("circuit1", []): md += f"- {t}\n"
            
            md += f"\n**{label2}**:\n"
            for t in dc.get("circuit2", []): md += f"- {t}\n"
            md += "\n"

        if "driving_style_implications" in analysis_json:
            md += "### Driving Style Implications\n"
            ds = analysis_json["driving_style_implications"]
            c1 = ds.get("circuit1", {})
            c2 = ds.get("circuit2", {})
            
            md += f"#### {label1} ({c1.get('title', '')})\n"
            for p in c1.get("points", []): md += f"- {p}\n"
            
            md += f"\n#### {label2} ({c2.get('title', '')})\n"
            for p in c2.get("points", []): md += f"- {p}\n"
            md += "\n"

        if "setup_recommendations" in analysis_json:
            md += "### Setup Recommendations\n"
            sr = analysis_json["setup_recommendations"]
            c1 = sr.get("circuit1", {})
            c2 = sr.get("circuit2", {})
            
            md += f"| Component | {label1} | {label2} |\n"
            md += "| :--- | :--- | :--- |\n"
            keys = ["chassis", "gearing", "tyre_pressures", "brake_bias", "differential"]
            for k in keys:
                md += f"| {k.replace('_', ' ').title()} | {c1.get(k, '-')} | {c2.get(k, '-')} |\n"
            md += "\n"

    # 5. Methodology (Documentation)
    md += "## 5. Methodology & Definitions / Méthodologie\n\n"
    try:
        with open("circuit_characteristics_description.md", "r", encoding="utf-8") as f:
            doc_content = f.read()
            # Remove title from doc content to fit hierarchy
            doc_content = doc_content.replace("# Circuit Characteristics from Telemetry (AiM CSV)", "")
            md += doc_content
    except:
        md += "Documentation not found."

    return md

def generate_report_package(features1, features2, label1, label2, radar_fig, map_fig1, map_fig2, analysis_json, language="en"):
    """
    Creates a ZIP file containing the Markdown report and images.
    Returns the bytes of the ZIP file.
    """
    
    # 1. Generate Images
    radar_bytes = save_fig_to_bytes(radar_fig)
    map1_bytes = save_fig_to_bytes(map_fig1)
    map2_bytes = save_fig_to_bytes(map_fig2)
    
    # 2. Generate Markdown
    md_content = generate_markdown_content(features1, features2, label1, label2, analysis_json, language)
    
    # 3. Create ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("analysis_report.md", md_content)
        zip_file.writestr("radar_comparison.png", radar_bytes)
        zip_file.writestr("track_layout_1.png", map1_bytes)
        zip_file.writestr("track_layout_2.png", map2_bytes)
    
    zip_buffer.seek(0)
    return zip_buffer
