import sys
import re
from pathlib import Path

# Add src to path if needed
sys.path.append(str(Path(__file__).parent))

from src.pdf_exporter import PDFReport

def sanitize_text(text):
    """Replaces unsupported unicode characters with ASCII equivalents."""
    replacements = {
        "\u2014": "-", # em-dash
        "\u2013": "-", # en-dash
        "\u2018": "'", # left single quote
        "\u2019": "'", # right single quote
        "\u201c": '"', # left double quote
        "\u201d": '"', # right double quote
        "\u2026": "..." # ellipsis
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text

def parse_markdown_table(lines):
    """Parses a list of markdown table lines into a list of lists."""
    table_data = []
    for line in lines:
        if line.strip().startswith("|") and "---" not in line:
            # Remove leading/trailing pipes and split
            row = [cell.strip() for cell in line.strip().strip("|").split("|")]
            table_data.append(row)
    return table_data

def generate_pdf(folder_path: str):
    folder = Path(folder_path).resolve()

    if not folder.exists() or not folder.is_dir():
        print(f"Creating folder: {folder}")
        folder.mkdir(parents=True, exist_ok=True)
        # return # Should we return? User asked to fix it to work with folder test. 
        # If it doesn't exist, we can't convert anything.
        if not folder.exists():
             raise ValueError(f"Dossier invalide : {folder}")

    md_files = list(folder.glob("*.md"))

    if not md_files:
        raise FileNotFoundError("Aucun fichier .md trouvé dans le dossier.")

    md_file = md_files[0]
    output_pdf = folder / f"{md_file.stem}.pdf"

    print(f"📄 Markdown : {md_file.name}")
    print(f"📦 Sortie PDF : {output_pdf.name}")

    # Read Markdown content
    with open(md_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Initialize PDF
    # Try to extract title and date from metadata or first lines
    title = "Analysis Report"
    date_str = "2026-01-03"
    
    # Simple Metadata Parsing
    for i, line in enumerate(lines[:10]):
        if line.startswith("# "):
            title = line.replace("# ", "").strip()
        if "**Date:**" in line:
            date_str = line.split("**Date:**")[1].strip()

    pdf = PDFReport(title, date_str)
    pdf.add_page()

    # Parsing Loop
    in_table = False
    table_lines = []
    
    i = 0
    while i < len(lines):
        line = sanitize_text(lines[i].strip())
        
        # Skip empty lines (unless needed for spacing)
        if not line:
            pdf.ln(2)
            i += 1
            continue

        # Headers
        if line.startswith("# "):
            # Main title already handled
            i += 1
            continue
        elif line.startswith("## "):
            pdf.chapter_title(line.replace("## ", ""))
            i += 1
            continue
        elif line.startswith("### "):
            pdf.set_font('Helvetica', 'B', 11)
            pdf.cell(0, 8, line.replace("### ", ""), ln=True)
            i += 1
            continue
        elif line.startswith("#### "):
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, line.replace("#### ", ""), ln=True)
            i += 1
            continue

        # Images (Standalone)
        # Check for multiple images on one line (side-by-side outside table)
        img_matches = re.findall(r'!\[.*?\]\((.*?)\)', line)
        if img_matches and not "|" in line:
            if len(img_matches) >= 2:
                 # Side by side without table
                 img1 = folder / img_matches[0].strip()
                 img2 = folder / img_matches[1].strip()
                 if img1.exists() and img2.exists():
                     pdf.add_side_by_side_images(str(img1), str(img2), "Circuit 1", "Circuit 2")
                 else:
                     pdf.set_font('Helvetica', 'I', 10)
                     pdf.cell(0, 10, f"[Images not found: {img_matches}]", ln=True)
            elif len(img_matches) == 1:
                # Single image
                img_path = folder / img_matches[0].strip()
                if img_path.exists():
                    pdf.add_image(str(img_path), w=100) # Reduced from 120
                else:
                    pdf.set_font('Helvetica', 'I', 10)
                    pdf.cell(0, 10, f"[Image not found: {img_matches[0]}]", ln=True)
            i += 1
            continue

        # Tables
        if line.startswith("|"):
            # Check if it's an image table (Special case for this project)
            # Robust detection: split by pipe and check for images
            if "![" in line:
                # Split line by pipe to get cells
                cells = [c.strip() for c in line.strip().strip("|").split("|")]
                
                # Extract image paths from cells
                img_paths = []
                labels = []
                
                for cell in cells:
                    img_match = re.search(r'!\[.*?\]\((.*?)\)', cell)
                    if img_match:
                        img_paths.append(folder / img_match.group(1).strip())
                    else:
                        labels.append(cell) # Keep non-image cells as labels?

                if len(img_paths) >= 2:
                    img1 = img_paths[0]
                    img2 = img_paths[1]
                    
                    # Attempt to find labels from previous line headers
                    label1, label2 = "Circuit 1", "Circuit 2" 
                    if i >= 2 and "|" in lines[i-2]:
                         headers = [h.strip() for h in lines[i-2].strip().strip("|").split("|")]
                         if len(headers) >= 2:
                             label1, label2 = headers[0], headers[1]

                    if img1.exists() and img2.exists():
                        pdf.add_side_by_side_images(str(img1), str(img2), label1, label2)
                    else:
                        print(f"❌ Images missing in table: {img1} or {img2}")
                        pdf.cell(0, 10, "[Images not found]", ln=True)
                    i += 1
                    continue
            
            # Regular Data Table
            table_lines = [line]
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("|"):
                table_lines.append(sanitize_text(lines[j].strip()))
                j += 1
            
            # Parse and render table
            data = parse_markdown_table(table_lines)
            if data:
                # Robust table renderer with MultiCell
                col_width = 190 / len(data[0]) if data else 60
                line_height = 5
                
                for row_idx, row in enumerate(data):
                    # Set font for header or body
                    if row_idx == 0:
                        pdf.set_font('Helvetica', 'B', 10)
                    else:
                        pdf.set_font('Helvetica', '', 10)
                    
                    # Calculate max height for this row
                    max_lines = 1
                    cell_lines_list = []
                    
                    for cell in row:
                        # split_only=True returns list of strings that would be printed
                        # Use simple wrapper to avoid weird side effects if cell is empty
                        if not cell:
                             cell_lines_list.append([])
                             continue
                             
                        content_lines = pdf.multi_cell(col_width, line_height, cell, split_only=True)
                        cell_lines_list.append(content_lines)
                        max_lines = max(max_lines, len(content_lines))
                    
                    row_height = max_lines * line_height
                    
                    # Check page break
                    if pdf.get_y() + row_height > 270: 
                        pdf.add_page()
                    
                    # Render cells
                    x_start = pdf.get_x()
                    y_start = pdf.get_y()
                    
                    for k, content_lines in enumerate(cell_lines_list):
                        x_cell = x_start + (k * col_width)
                        
                        # Draw Text
                        pdf.set_xy(x_cell, y_start)
                        # multi_cell might output nothing if content_lines is empty, which is fine
                        if content_lines:
                             pdf.multi_cell(col_width, line_height, "\n".join(content_lines), border=0, align='L')
                        
                        # Draw Border (Rectangle) with equal height
                        pdf.rect(x_cell, y_start, col_width, row_height)
                    
                    # Move cursor to next row
                    pdf.set_y(y_start + row_height)
            
            pdf.ln(5)
            i = j
            continue

        # Bullets
        if line.startswith("- ") or line.startswith("* "):
            pdf.set_font('Helvetica', '', 10)
            # Handle bolding **text** manually? 
            # FPDF doesn't support markdown in multi_cell easily without enabling it.
            # Let's clean bold markers for now or use simple replacement
            clean_line = line.replace("**", "").replace("*", "")
            pdf.set_x(10) # Force reset X just in case
            pdf.multi_cell(0, 5, f"  {clean_line}")
            i += 1
            continue

        # Plain Text
        clean_line = line.replace("**", "") # Simple bold strip
        pdf.set_font('Helvetica', '', 10)
        pdf.set_x(10) # Force reset X just in case
        pdf.multi_cell(0, 5, clean_line)
        i += 1

    pdf.output(str(output_pdf))
    print("✅ PDF généré avec succès (via Python/FPDF)")


if __name__ == "__main__":
    target_folder = "test"
    if len(sys.argv) == 2:
        target_folder = sys.argv[1]
    
    generate_pdf(target_folder)
