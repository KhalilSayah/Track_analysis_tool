import pandas as pd

def load_csv(file):
    """
    Loads an AiM CSV file.
    Skips the first 14 lines (metadata) and cleans column names.
    
    Args:
        file: File path or file-like object (uploaded file).
        
    Returns:
        pd.DataFrame: Processed dataframe.
    """
    # The original notebook used skiprows=range(0, 14).
    # When using file-like objects (streamlit upload), this still works with pd.read_csv.
    df = pd.read_csv(file, skiprows=range(0, 14))
    
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    
    # Convert all columns to numeric, coercing errors to NaN
    df = df.apply(pd.to_numeric, errors='coerce')
    
    return df
