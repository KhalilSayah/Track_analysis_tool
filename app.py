
import streamlit as st
import pandas as pd
import os
from src.data_loader import load_csv
from src.analyzer import compute_circuit_characteristics
from src.visualizer import plot_track, plot_circuit_radar_zscore
from src.ai_interpreter import analyze_comparison
from src.translations import get_text
from src.report_generator import generate_report_package
from src.pdf_exporter import generate_pdf_report

# Hardcoded API Key (as requested)
MISTRAL_API_KEY = "9WzPqRnYfvFcH6Osj6KVQOIK1gPjNfrH"

def main():
    st.set_page_config(page_title="Karting Circuit Analysis", layout="wide")

    # Language selection first
    lang_options = {"English": "en", "Français": "fr"}
    lang_selection = st.sidebar.selectbox("Language / Langue", list(lang_options.keys()))
    lang = lang_options[lang_selection]

    st.title(get_text(lang, "title"))
    st.markdown(get_text(lang, "description"))

    # Sidebar for Inputs
    st.sidebar.header(get_text(lang, "sidebar_data"))
    
    # Allow uploading two files for comparison
    file1 = st.sidebar.file_uploader(get_text(lang, "upload_c1"), type=["csv"])
    label1 = st.sidebar.text_input(get_text(lang, "label_c1"), get_text(lang, "default_c1"))
    
    file2 = st.sidebar.file_uploader(get_text(lang, "upload_c2"), type=["csv"])
    label2 = st.sidebar.text_input(get_text(lang, "label_c2"), get_text(lang, "default_c2"))
    
    st.sidebar.markdown("---")
    st.sidebar.header(get_text(lang, "sidebar_ai"))
    st.sidebar.info(get_text(lang, "api_key_help"))
    # api_key = st.sidebar.text_input("Mistral API Key", type="password", help=get_text(lang, "api_key_help"))
    api_key = MISTRAL_API_KEY

    # Tabs for different sections
    tab1, tab2, tab3 = st.tabs(get_text(lang, "tabs"))

    # Initialize session state for analysis if not present
    if 'analysis' not in st.session_state:
        st.session_state['analysis'] = None

    features1 = None
    features2 = None
    df1 = None
    df2 = None

    with tab1:
        st.header(get_text(lang, "header_analysis"))
        
        if file1 and file2:
            try:
                # Process File 1
                file1.seek(0)
                df1 = load_csv(file1)
                features1 = compute_circuit_characteristics(df1)
                
                # Process File 2
                file2.seek(0)
                df2 = load_csv(file2)
                features2 = compute_circuit_characteristics(df2)

                col1, col2 = st.columns([1, 1])

                # Store radar fig for export
                radar_fig = plot_circuit_radar_zscore(features1, features2, labels=(label1, label2))

                with col1:
                    st.subheader(get_text(lang, "header_radar"))
                    st.pyplot(radar_fig)

                with col2:
                    st.subheader(get_text(lang, "header_metrics"))
                    
                    # Create a DataFrame for display
                    metrics_df = pd.DataFrame([features1, features2], index=[label1, label2]).T
                    st.dataframe(metrics_df.style.format("{:.2f}"))

                    st.markdown("---")
                    st.subheader(get_text(lang, "header_ai"))
                    
                    if st.button(get_text(lang, "btn_generate")):
                        with st.spinner(get_text(lang, "spinner_ai")):
                            analysis = analyze_comparison(features1, features2, label1, label2, api_key, language=lang)
                            st.session_state['analysis'] = analysis

                    # Display Analysis if available
                    if st.session_state['analysis']:
                        analysis = st.session_state['analysis']
                        if "error" in analysis:
                            st.error(analysis["error"])
                            if "raw_text" in analysis:
                                st.text_area(get_text(lang, "raw_response"), analysis["raw_text"])
                        else:
                            # 1. Key Metric Differences
                            st.markdown(f"### {get_text(lang, 'key_metrics')}")
                            if "key_metric_differences" in analysis:
                                diff_df = pd.DataFrame(analysis["key_metric_differences"])
                                st.dataframe(diff_df, use_container_width=True)

                            # 2. Defining Characteristics
                            st.markdown(f"### {get_text(lang, 'defining_chars')}")
                            if "defining_characteristics" in analysis:
                                char_col1, char_col2 = st.columns(2)
                                
                                with char_col1:
                                    st.markdown(f"**{label1}**")
                                    for trait in analysis["defining_characteristics"].get("circuit1", []):
                                        st.info(trait)
                                
                                with char_col2:
                                    st.markdown(f"**{label2}**")
                                    for trait in analysis["defining_characteristics"].get("circuit2", []):
                                        st.warning(trait)

                            # 3. Driving Style Implications
                            st.markdown(f"### {get_text(lang, 'driving_style')}")
                            if "driving_style_implications" in analysis:
                                drive_col1, drive_col2 = st.columns(2)
                                
                                ds = analysis["driving_style_implications"]
                                c1_ds = ds.get("circuit1", {})
                                c2_ds = ds.get("circuit2", {})
                                
                                with drive_col1:
                                    st.subheader(f"{label1}")
                                    st.caption(c1_ds.get("title", ""))
                                    for point in c1_ds.get("points", []):
                                        st.markdown(f"- {point}")
                                        
                                with drive_col2:
                                    st.subheader(f"{label2}")
                                    st.caption(c2_ds.get("title", ""))
                                    for point in c2_ds.get("points", []):
                                        st.markdown(f"- {point}")

                            # 4. Setup Recommendations
                            st.markdown(f"### {get_text(lang, 'setup_rec')}")
                            if "setup_recommendations" in analysis:
                                setup_col1, setup_col2 = st.columns(2)
                                
                                setup = analysis["setup_recommendations"]
                                c1_setup = setup.get("circuit1", {})
                                c2_setup = setup.get("circuit2", {})

                                with setup_col1:
                                    st.subheader(f"{label1} {get_text(lang, 'setup_suffix')}")
                                    st.caption(c1_setup.get("title", ""))
                                    st.write(f"**{get_text(lang, 'chassis')}:** {c1_setup.get('chassis', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'gearing')}:** {c1_setup.get('gearing', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'tyres')}:** {c1_setup.get('tyre_pressures', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'brakes')}:** {c1_setup.get('brake_bias', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'diff')}:** {c1_setup.get('differential', 'N/A')}")
                                    
                                with setup_col2:
                                    st.subheader(f"{label2} {get_text(lang, 'setup_suffix')}")
                                    st.caption(c2_setup.get("title", ""))
                                    st.write(f"**{get_text(lang, 'chassis')}:** {c2_setup.get('chassis', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'gearing')}:** {c2_setup.get('gearing', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'tyres')}:** {c2_setup.get('tyre_pressures', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'brakes')}:** {c2_setup.get('brake_bias', 'N/A')}")
                                    st.write(f"**{get_text(lang, 'diff')}:** {c2_setup.get('differential', 'N/A')}")

                            # 5. Final Summary
                            st.markdown(f"### {get_text(lang, 'final_summary')}")
                            if "final_summary" in analysis:
                                for note in analysis["final_summary"]:
                                    st.success(note)
                            
                            # Export to ZIP Button
                            st.markdown("---")
                            col1, col2 = st.columns(2)
                            
                            with col1:
                                st.subheader("Research Package (ZIP)")
                                st.info(get_text(lang, "zip_help"))
                                if st.button(get_text(lang, "btn_export_zip"), key="btn_zip"):
                                    with st.spinner("Generating ZIP..."):
                                        map_fig1 = plot_track(df1, label1)
                                        map_fig2 = plot_track(df2, label2)
                                        zip_buffer = generate_report_package(
                                            features1, features2, label1, label2,
                                            radar_fig, map_fig1, map_fig2,
                                            analysis, language=lang
                                        )
                                        st.download_button(
                                            label=get_text(lang, "download_zip"),
                                            data=zip_buffer,
                                            file_name="karting_analysis_package.zip",
                                            mime="application/zip"
                                        )
                                        st.success(get_text(lang, "success_export_zip"))
                            
                            with col2:
                                st.subheader("PDF Report")
                                st.info("Direct PDF Export (Research Format)")
                                if st.button(get_text(lang, "btn_export_pdf"), key="btn_pdf"):
                                    with st.spinner("Generating PDF..."):
                                        map_fig1 = plot_track(df1, label1)
                                        map_fig2 = plot_track(df2, label2)
                                        pdf_path = generate_pdf_report(
                                            features1, features2, label1, label2,
                                            radar_fig, map_fig1, map_fig2,
                                            analysis, language=lang
                                        )
                                        with open(pdf_path, "rb") as pdf_file:
                                            pdf_bytes = pdf_file.read()
                                        st.download_button(
                                            label=get_text(lang, "download_pdf"),
                                            data=pdf_bytes,
                                            file_name="circuit_analysis_report.pdf",
                                            mime="application/pdf"
                                        )
                                        st.success(get_text(lang, "success_export_pdf"))

            except Exception as e:
                st.error(get_text(lang, "error_processing").format(e))
                # raise e # Debug
        
        elif file1:
             # Single file analysis
            df1 = load_csv(file1)
            features1 = compute_circuit_characteristics(df1)
            st.write(get_text(lang, "stats_for").format(label1))
            st.json(features1)
            st.info(get_text(lang, "info_upload_second"))
            
        else:
            st.info(get_text(lang, "info_upload_first"))

    with tab2:
        st.header(get_text(lang, "header_maps"))
        col_map1, col_map2 = st.columns(2)
        
        if file1:
            file1.seek(0) # Reset pointer
            df1 = load_csv(file1)
            with col_map1:
                st.subheader(label1)
                fig1 = plot_track(df1, label1)
                st.pyplot(fig1)
        
        if file2:
            file2.seek(0) # Reset pointer
            df2 = load_csv(file2)
            with col_map2:
                st.subheader(label2)
                fig2 = plot_track(df2, label2)
                st.pyplot(fig2)

    with tab3:
        # Load the detailed documentation
        doc_path = "circuit_characteristics_description.md"
        if os.path.exists(doc_path):
            with open(doc_path, "r", encoding="utf-8") as f:
                content = f.read()
            st.markdown(content)
        else:
            st.error(get_text(lang, "error_doc_not_found"))


if __name__ == "__main__":
    main()
