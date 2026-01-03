import matplotlib.pyplot as plt
import numpy as np

def plot_track(df, label):
    """
    Plots the GPS track map.
    
    Args:
        df (pd.DataFrame): Dataframe containing 'GPS Longitude' and 'GPS Latitude'.
        label (str): Label for the title.
        
    Returns:
        matplotlib.figure.Figure: The figure object.
    """
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.plot(df['GPS Longitude'], df['GPS Latitude'])
    ax.axis('equal')
    ax.set_title(f'{label} Layout (GPS)')
    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    plt.tight_layout()
    return fig

def plot_circuit_radar_zscore(circuit1, circuit2, labels=("Circuit 1", "Circuit 2"), title="Circuit Comparison (Z-score Normalized)"):
    """
    Plots a comparative radar chart using Z-score normalization.
    
    Args:
        circuit1 (dict): Features of the first circuit.
        circuit2 (dict): Features of the second circuit.
        labels (tuple): Names of the circuits.
        title (str): Chart title.
        
    Returns:
        matplotlib.figure.Figure: The figure object.
    """
    # 1. Calculate Z-scores
    z_scores = {}
    for k in circuit1:
        values = np.array([circuit1[k], circuit2[k]])
        mean = values.mean()
        std = values.std(ddof=0)  # population std
        
        if std == 0:
            z_scores[k] = [0, 0]
        else:
            z_scores[k] = [(v - mean)/std for v in values]

    # 2. Prepare Radar Data
    criteria = list(circuit1.keys())
    angles = np.linspace(0, 2*np.pi, len(criteria), endpoint=False).tolist()
    angles += angles[:1]  # Close the loop

    values1 = [z_scores[k][0] for k in criteria] + [z_scores[criteria[0]][0]]
    values2 = [z_scores[k][1] for k in criteria] + [z_scores[criteria[0]][1]]

    # 3. Plot
    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    
    # Plot Circuit 1
    ax.plot(angles, values1, label=labels[0], linewidth=2)
    ax.fill(angles, values1, alpha=0.15)
    
    # Plot Circuit 2
    ax.plot(angles, values2, label=labels[1], linewidth=2)
    ax.fill(angles, values2, alpha=0.15)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(criteria, size=10)
    
    # Auto-scale
    all_values = values1 + values2
    margin = 0.5
    if all_values:
        ax.set_ylim(min(all_values)-margin, max(all_values)+margin)
    
    ax.set_title(title, y=1.08, size=14)
    # Move legend closer and use columns if needed
    ax.legend(loc="upper right", bbox_to_anchor=(1.2, 1.1))
    
    # Use tight_layout with padding to prevent the "Not enough horizontal space" error
    # which happens when elements are pushed too far out
    plt.tight_layout()
    
    return fig
