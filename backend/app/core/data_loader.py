import pandas as pd
import io
import csv

def load_csv(file):
    """
    Loads an AiM CSV file and extracts metadata.
    
    Args:
        file: File path or file-like object (uploaded file).
        
    Returns:
        tuple: (pd.DataFrame, dict) -> (df, metadata)
    """
    metadata = {}
    
    # Ensure we have a file-like object
    if not hasattr(file, 'read'):
        with open(file, 'rb') as f:
            content_bytes = f.read()
    else:
        # It's a file-like object
        # Save current position if needed, but we usually start from 0
        file.seek(0)
        content_bytes = file.read()
        
    # Decode content
    try:
        content_str = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        content_str = content_bytes.decode('latin-1', errors='ignore')
        
    all_lines = content_str.splitlines()
    data_start_line = 0
    
    # Parse Metadata & Find Header
    for idx, line in enumerate(all_lines):
        line_stripped = line.strip()
        
        # Check for Data Header (AiM usually starts with Time or "Time")
        # The user example has "Time","GPS Speed"...
        if line_stripped.startswith('"Time","GPS Speed"') or line_stripped.startswith('Time,GPS Speed'):
            data_start_line = idx
            break
            
        # Parse Metadata
        try:
            # Use csv reader to handle quoted values correctly
            reader = csv.reader([line_stripped])
            parts = next(reader)
            
            if len(parts) >= 2:
                key = parts[0]
                # Store list for these specific keys
                if key in ["Segment Times", "Beacon Markers"]:
                    metadata[key] = parts[1:]
                else:
                    metadata[key] = parts[1]
        except:
            continue
            
    # Load DataFrame
    # Create a new stream for pandas
    data_stream = io.StringIO(content_str)
    
    # Skip rows until data_start_line
    try:
        df = pd.read_csv(data_stream, skiprows=range(0, data_start_line))
    except Exception as e:
        print(f"Error loading CSV data: {e}")
        df = pd.DataFrame() # Return empty on failure
        
    # Clean columns
    df.columns = df.columns.str.strip().str.replace('"', '')
    
    # Numeric conversion
    df = df.apply(pd.to_numeric, errors='coerce')
    
    return df, metadata
