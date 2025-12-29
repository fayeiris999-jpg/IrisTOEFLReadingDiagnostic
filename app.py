import streamlit as st
import streamlit.components.v1 as components
import os

# Set page configuration
st.set_page_config(
    page_title="TOEFL Reading Sprint Diagnostic",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom CSS to hide Streamlit elements for a full-screen feel
hide_streamlit_style = """
<style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container {
        padding-top: 0rem;
        padding-bottom: 0rem;
        padding-left: 0rem;
        padding-right: 0rem;
    }
    iframe {
        display: block; /* fix spacing */
    }
</style>
"""
st.markdown(hide_streamlit_style, unsafe_allow_html=True)

# Path to the static index file
# When [server] enableStaticServing = true is set in .streamlit/config.toml,
# files in the 'static' folder are served at the root path.
INDEX_URL = "http://localhost:8080/index.html"

# Fallback for local development if the /app/static/ path doesn't resolve as expected
# (e.g., depending on Streamlit version or local config)
# We can try to construct a path or just rely on the standard.
# For Streamlit Cloud, 'app/static/index.html' is correct.

st.markdown(f"""
    <iframe src="{INDEX_URL}" width="100%" height="1000px" style="border:none; height: 100vh; width: 100vw;"></iframe>
""", unsafe_allow_html=True)

# Note: If running locally, you might need to access http://localhost:8501/app/static/index.html directly
# or ensure the static folder is picked up.
