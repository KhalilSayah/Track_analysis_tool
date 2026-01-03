from fpdf import FPDF
import matplotlib.pyplot as plt
import pandas as pd
import tempfile
import os

class PDFReport(FPDF):
    def __init__(self, title_text, date_text):
        super().__init__()
        self.title_text = title_text
        self.date_text = date_text
        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, self.title_text, align='C')
        self.ln(10)
        self.set_font('Helvetica', 'I', 10)
        self.cell(0, 10, self.date_text, align='R')
        self.ln(10)
        self.line(10, 30, 200, 30)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 10, title, fill=True, ln=True)
        self.ln(5)

    def chapter_body(self, text):
        self.set_font('Helvetica', '', 11)
        self.multi_cell(0, 6, text)
        self.ln()

    def add_image(self, img_path, w=100):
        self.image(img_path, w=w, x=(210-w)/2) # Center image
        self.ln(5)

    def add_side_by_side_images(self, img1_path, img2_path, label1, label2):
        y = self.get_y()
        w = 75 # Reduced size to fit better
        
        # Center images in their halves
        # Left (0-105): Center 52.5 -> x = 15
        # Right (105-210): Center 157.5 -> x = 120
        x1 = 15
        x2 = 120
        
        self.image(img1_path, x=x1, y=y, w=w)
        self.image(img2_path, x=x2, y=y, w=w)
        self.ln(w/1.5) # Approximate height
        
        # Labels
        self.set_font('Helvetica', 'B', 10)
        self.set_xy(x1, self.get_y())
        self.cell(w, 5, label1, align='C')
        self.set_xy(x2, self.get_y())
        self.cell(w, 5, label2, align='C')
        self.ln(10)

def create_temp_image(fig):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmpfile:
        try:
            fig.savefig(tmpfile.name, format='png', bbox_inches='tight')
        except ValueError:
            # Fallback if tight_layout fails
            fig.savefig(tmpfile.name, format='png')
        return tmpfile.name

def generate_pdf_report(features1, features2, label1, label2, radar_fig, map_fig1, map_fig2, analysis_json, language="en"):
    from datetime import datetime
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    title = "Karting Circuit Comparison Report" if language == "en" else "Rapport de Comparaison de Circuits de Karting"
    pdf = PDFReport(title, date_str)
    pdf.add_page()

    # 1. Executive Summary (Final Summary from AI)
    if analysis_json and "final_summary" in analysis_json:
        pdf.chapter_title("1. Executive Summary / Résumé Exécutif")
        pdf.set_font('Helvetica', '', 11)
        for item in analysis_json["final_summary"]:
            pdf.multi_cell(0, 6, f"- {item}")
        pdf.ln(5)

    # 2. Visual Analysis
    pdf.chapter_title("2. Visual Analysis / Analyse Visuelle")
    
    # Track Maps
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 8, "Track Layouts / Tracés", ln=True)
    map1_path = create_temp_image(map_fig1)
    map2_path = create_temp_image(map_fig2)
    pdf.add_side_by_side_images(map1_path, map2_path, label1, label2)
    
    # Radar Chart
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 8, "Performance Radar / Comparaison Radar", ln=True)
    radar_path = create_temp_image(radar_fig)
    pdf.add_image(radar_path, w=100)

    # 3. Metrics Table
    pdf.chapter_title("3. Key Metrics / Métriques Clés")
    pdf.set_font('Helvetica', 'B', 10)
    
    # Simple table
    col_width = 60
    row_height = 8
    
    # Header
    pdf.cell(col_width, row_height, "Metric", border=1)
    pdf.cell(col_width/1.5, row_height, label1, border=1)
    pdf.cell(col_width/1.5, row_height, label2, border=1)
    pdf.ln()
    
    pdf.set_font('Helvetica', '', 10)
    for key in features1:
        val1 = features1[key]
        val2 = features2.get(key, 0)
        pdf.cell(col_width, row_height, str(key), border=1)
        pdf.cell(col_width/1.5, row_height, f"{val1:.2f}", border=1)
        pdf.cell(col_width/1.5, row_height, f"{val2:.2f}", border=1)
        pdf.ln()
    pdf.ln(10)

    # 4. Detailed AI Analysis
    if analysis_json and "error" not in analysis_json:
        pdf.chapter_title("4. AI Detailed Analysis / Analyse Détaillée IA")
        
        # Helper to print sections
        def print_section(title, content):
            pdf.set_font('Helvetica', 'B', 11)
            pdf.cell(0, 8, title, ln=True)
            pdf.set_font('Helvetica', '', 10)
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                         # For key metric differences list of dicts
                         line = f"- {item.get('metric', '')}: {item.get('difference', '')} ({item.get('interpretation', '')})"
                         pdf.multi_cell(0, 5, line)
                    else:
                        pdf.multi_cell(0, 5, f"- {item}")
            elif isinstance(content, dict):
                 # Check for circuit1/circuit2 structure
                 c1_content = content.get("circuit1", [])
                 c2_content = content.get("circuit2", [])
                 
                 if c1_content:
                     pdf.set_font('Helvetica', 'B', 10)
                     pdf.cell(0, 6, f"{label1}:", ln=True)
                     pdf.set_font('Helvetica', '', 10)
                     if isinstance(c1_content, list):
                         for item in c1_content: pdf.multi_cell(0, 5, f"- {item}")
                     elif isinstance(c1_content, dict): # For driving style title/points
                         if "title" in c1_content: pdf.multi_cell(0, 5, f"Title: {c1_content['title']}")
                         for item in c1_content.get("points", []): pdf.multi_cell(0, 5, f"- {item}")
                     else: # Setup recommendations simple dict
                         for k, v in c1_content.items(): pdf.multi_cell(0, 5, f"- {k}: {v}")

                 pdf.ln(2)
                 
                 if c2_content:
                     pdf.set_font('Helvetica', 'B', 10)
                     pdf.cell(0, 6, f"{label2}:", ln=True)
                     pdf.set_font('Helvetica', '', 10)
                     if isinstance(c2_content, list):
                         for item in c2_content: pdf.multi_cell(0, 5, f"- {item}")
                     elif isinstance(c2_content, dict):
                         if "title" in c2_content: pdf.multi_cell(0, 5, f"Title: {c2_content['title']}")
                         for item in c2_content.get("points", []): pdf.multi_cell(0, 5, f"- {item}")
                     else:
                         for k, v in c2_content.items(): pdf.multi_cell(0, 5, f"- {k}: {v}")
            else:
                pdf.multi_cell(0, 5, str(content))
            pdf.ln(5)

        if "key_metric_differences" in analysis_json:
            print_section("Key Metric Differences", analysis_json["key_metric_differences"])
            
        if "defining_characteristics" in analysis_json:
            print_section("Defining Characteristics", analysis_json["defining_characteristics"])
            
        if "driving_style_implications" in analysis_json:
            print_section("Driving Style Implications", analysis_json["driving_style_implications"])
            
        if "setup_recommendations" in analysis_json:
            # Special handling for setup table-like structure if needed, or just list
            print_section("Setup Recommendations", analysis_json["setup_recommendations"])

    # 5. Methodology
    pdf.chapter_title("5. Methodology & Definitions / Méthodologie")
    try:
        with open("circuit_characteristics_description.md", "r", encoding="utf-8") as f:
            lines = f.readlines()
            for line in lines:
                line = line.strip()
                if not line:
                    pdf.ln(2)
                    continue
                
                if line.startswith("# "): # H1 - Skip or Title
                    continue
                elif line.startswith("## "): # H2
                    pdf.set_font('Helvetica', 'B', 11)
                    pdf.cell(0, 8, line.replace("## ", ""), ln=True)
                elif line.startswith("### "): # H3
                    pdf.set_font('Helvetica', 'B', 10)
                    pdf.cell(0, 6, line.replace("### ", ""), ln=True)
                elif line.startswith("- ") or line.startswith("* "):
                    pdf.set_font('Helvetica', '', 10)
                    pdf.multi_cell(0, 5, f"  {line}") # Indent bullets
                else:
                    pdf.set_font('Helvetica', '', 10)
                    pdf.multi_cell(0, 5, line)
    except Exception as e:
        pdf.set_font('Helvetica', 'I', 10)
        pdf.cell(0, 10, "Methodology documentation not found.", ln=True)

    # Output
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
        pdf.output(tmp_pdf.name)
        return tmp_pdf.name

    # Clean up images
    try:
        os.remove(map1_path)
        os.remove(map2_path)
        os.remove(radar_path)
    except:
        pass
