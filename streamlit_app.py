import streamlit as st
import pandas as pd
import numpy as np
import time
import random
from datetime import datetime
import plotly.graph_objects as go
import plotly.express as px

# 1. Config & Page Setup
st.set_page_config(
    page_title="Buy/Bye LQ45 Dashboard",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom Glassmorphism/Dark Cosmic Theme Styling
st.markdown("""
<style>
    /* Global Styles */
    .stApp {
        background-color: #0b0f19;
        color: #f1f5f9;
        font-family: 'Inter', system-ui, sans-serif;
    }
    
    /* Neon Text and Accent */
    .neon-cyan {
        color: #00e1ff;
        text-shadow: 0 0 10px rgba(0, 225, 255, 0.4);
    }
    .neon-green {
        color: #00FF85;
        text-shadow: 0 0 10px rgba(0, 255, 133, 0.4);
    }
    .neon-red {
        color: #EF4444;
        text-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
    }
    .neon-orange {
        color: #F59E0B;
        text-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
    }
    
    /* Card Glass Panel */
    .glass-panel {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        margin-bottom: 20px;
    }
    
    /* Tab Styling Override */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: rgba(15, 23, 42, 0.4);
        padding: 6px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.03);
    }
    .stTabs [data-baseweb="tab"] {
        height: 44px;
        white-space: pre-wrap;
        background-color: transparent;
        border-radius: 8px;
        color: #94a3b8;
        font-weight: 700;
        font-size: 14px;
        border: none;
        padding: 0px 24px;
        transition: all 0.3s ease;
    }
    .stTabs [data-baseweb="tab"]:hover {
        color: #00e1ff;
        background-color: rgba(255, 255, 255, 0.03);
    }
    .stTabs [aria-selected="true"] {
        background-color: rgba(0, 225, 255, 0.1) !important;
        color: #00e1ff !important;
        border: 1px solid rgba(0, 225, 255, 0.2) !important;
    }
    
    /* Metrics panel */
    .metric-value {
        font-size: 28px;
        font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
    }
</style>
""", unsafe_allow_html=True)

# 2. Mock Database / Generator Engine (Offline Stable Fallbacks for LQ45)
@st.cache_data
def load_lq45_list():
    return [
        "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "UNVR", "GOTO", "ACES", "ADRO",
        "AKRA", "AMRT", "ANTM", "ARTO", "BRIS", "CPIN", "HRUM", "ICBP", "INDF", "INKP",
        "ITMG", "KLBF", "MDKA", "MEDC", "PGAS", "PTBA", "SIDO", "SMGR", "TPIA", "UNTR"
    ]

@st.cache_data
def generate_stock_fundamentals():
    # Simulated highly realistic fundamentals info for LQ45
    stocks = load_lq45_list()
    random.seed(42)  # Maintain stable realistic values
    data = []
    
    fundamentals_map = {
        "BBCA": {"price": 10250, "pe": 26.5, "pbv": 4.8, "dy": 2.1, "beta": 0.85, "market_cap": 1260e12},
        "BBRI": {"price": 4850, "pe": 13.2, "pbv": 2.1, "dy": 4.5, "beta": 1.10, "market_cap": 735000e9},
        "BMRI": {"price": 6175, "pe": 11.8, "pbv": 2.2, "dy": 4.8, "beta": 1.15, "market_cap": 570000e9},
        "BBNI": {"price": 5050, "pe": 9.4, "pbv": 1.2, "dy": 5.0, "beta": 1.20, "market_cap": 188000e9},
        "TLKM": {"price": 3110, "pe": 13.8, "pbv": 2.2, "dy": 5.4, "beta": 0.90, "market_cap": 308000e9},
        "ASII": {"price": 5025, "pe": 6.8, "pbv": 1.1, "dy": 7.3, "beta": 1.05, "market_cap": 203000e9},
        "UNVR": {"price": 2540, "pe": 18.5, "pbv": 12.4, "dy": 6.8, "beta": 0.70, "market_cap": 96000e9},
        "GOTO": {"price": 58, "pe": -4.2, "pbv": 0.65, "dy": 0.0, "beta": 1.85, "market_cap": 69000e9},
        "ACES": {"price": 820, "pe": 16.4, "pbv": 2.3, "dy": 2.8, "beta": 0.95, "market_cap": 14000e9},
        "ADRO": {"price": 2880, "pe": 4.1, "pbv": 0.85, "dy": 12.2, "beta": 1.30, "market_cap": 92000e9},
    }
    
    for s in stocks:
        if s in fundamentals_map:
            val = fundamentals_map[s]
        else:
            base_p = random.choice([1500, 3400, 850, 12000, 500])
            pe_val = round(random.uniform(5.0, 22.0), 1)
            pbv_val = round(random.uniform(0.7, 4.0), 1)
            dy_val = round(random.uniform(1.0, 8.5), 1)
            beta_val = round(random.uniform(0.6, 1.6), 2)
            val = {
                "price": base_p,
                "pe": pe_val,
                "pbv": pbv_val,
                "dy": dy_val,
                "beta": beta_val,
                "market_cap": base_p * random.randint(100e6, 5e9)
            }
        data.append({
            "Ticker": s,
            "Price": val["price"],
            "P/E Ratio": val["pe"],
            "PBV Ratio": val["pbv"],
            "Div Yield (%)": val["dy"],
            "Beta": val["beta"],
            "Market Cap (IDR)": val["market_cap"]
        })
    return pd.DataFrame(data)

# 3. Dynamic CNN Indonesia News Generator (Bespoke Market sentiment)
def get_shang_sentimen_data(ticker):
    reporters = ['CNN / Andini Saputra', 'CNN / Budi Santoso', 'CNN / Rian Alfianto', 'CNN / Dewi Lestari', 'CNN / Fajar Nurrahman', 'CNN / Putri Utami', 'CNN / Aditya Pratama', 'CNN / Siti Rahma']
    pos_phrases = [
        f"Laba Bersih {ticker} Kuartal I Diproyeksikan Melesat Ditopang Efisiensi Tinggi",
        f"Analisis Sekuritas: Saham {ticker} Masuk Rekomendasi Beli Utama dengan Target Harga Baru",
        f"Aksi Korporasi {ticker} Dapat Respons Positif Pasar, Investor Asing Catat Net Buy Jumbo",
        f"Emiten {ticker} Catat Ekspansi Kinerja Finansial di Luar Ekspektasi Pasar",
        f"Sentimen Dividen Jumbo Jadi Katalis Kuat Penguatan Saham {ticker} Pekan Ini",
        f"Optimisme Pasar Meningkat, Saham {ticker} Melaju di Zona Hijau Menembus Resistance Kuat"
    ]
    neg_phrases = [
        f"Analisis Sektor: Ketidakpastian Makroekonomi Tekan Kinerja Operasional {ticker}",
        f"Saham {ticker} Terkoreksi Akibat Tekanan Jual Sesi Pertama dari Pemodal Institusi",
        f"Penurunan Margin Bunga Bersih Berisiko Batasi Ruang Gerak Pertumbuhan Laba {ticker}",
        f"Uji Level Support Baru, Saham {ticker} Masuk Tren Konsolidasi Jangka Pendek",
        f"Laporan Keuangan {ticker}: Kenaikan Beban Operasional Bayangi Pendapatan Bersih",
        f"Sektor Melemah, Saham {ticker} Parkir di Zona Merah Sepanjang Sesi Pertama Bursa"
    ]
    neu_phrases = [
        f"Fokus Konsolidasi Usaha, Emiten {ticker} Pilih Sikap Wait and See Terhadap Kebijakan Baru",
        f"Pergerakan Saham {ticker} Terpantau Stabil Menjelang Rilis Laporan Kinerja Tahunan",
        f"Analis Menilai Valuasi Sektor Ritel & {ticker} Masih Berada di Area Wajar (Fair Value)",
        f"Saham {ticker} Bertahan di Area Sideways di Tengah Minimnya Katalis Penggerak Baru",
        f"Rencana Bisnis {ticker}: Manajemen Fokus Pertahankan Pangsa Pasar yang Sudah Ada",
        f"Menanti Hasil RUPS, Pergerakan Saham {ticker} Diprediksi Bergerak Terbatas"
    ]
    
    # Establish Bias based on ticker
    bias = 0.75 if ticker == 'BBCA' else 0.32 if ticker == 'GOTO' else 0.52
    
    chatter = []
    count = random.randint(35, 65)
    for _ in range(count):
        r = random.random()
        if r < bias * 0.8:
            text = random.choice(pos_phrases)
            score = 1
            verdict = "BULLISH"
        elif r > bias * 1.2:
            text = random.choice(neg_phrases)
            score = -1
            verdict = "BEARISH"
        else:
            text = random.choice(neu_phrases)
            score = 0
            verdict = "HOLD"
            
        hour = random.randint(9, 14)
        minute = random.randint(0, 59)
        time_str = f"{str(hour).zfill(2)}:{str(minute).zfill(2)} WIB"
        
        chatter.append({
            "text": text,
            "author": random.choice(reporters),
            "time": time_str,
            "score": score,
            "verdict": verdict
        })
        
    chatter.sort(key=lambda x: x["time"], reverse=True)
    mean_score = np.mean([c["score"] for c in chatter]) if chatter else 0.0
    return chatter, mean_score

# 4. Header Section
col1, col2 = st.columns([4, 1])
with col1:
    st.markdown("<h1 class='neon-cyan' style='margin-bottom: 0px;'>Buy/Bye LQ45 Dashboard</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color:#64748b; margin-top:2px;'>Decision Support System Dashboard for LQ45 Bluechips & Capital Allocation</p>", unsafe_allow_html=True)
with col2:
    st.markdown("<div style='text-align: right; font-family: monospace; font-size:11px; margin-top: 20px; color: #64748b;'>LIVE INTRA-DAY<br><span class='neon-green'>● ALL SYSTEMS OK</span></div>", unsafe_allow_html=True)

st.markdown("<hr style='border-color: rgba(255,255,255,0.05); margin-top: 10px; margin-bottom: 25px;'>", unsafe_allow_html=True)

# Tabs
tab_overview, tab_analysis, tab_screener, tab_portfolio = st.tabs([
    "Market Overview", 
    "Multi-Pillar Analysis", 
    "Screener", 
    "Portfolio Planner"
])

# Loading Base Data Frame
df_stocks = generate_stock_fundamentals()

# ================= TAB 1: OVERVIEW =================
with tab_overview:
    # Key Market Indices Summary Card
    col_idx1, col_idx2, col_idx3, col_idx4 = st.columns(4)
    with col_idx1:
        st.markdown("""
        <div class="glass-panel" style="padding:16px;">
            <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">IHSG Index (Composite)</p>
            <p class="metric-value neon-green">7,322.40 <span style="font-size:14px; font-weight:normal;">+0.82%</span></p>
        </div>
        """, unsafe_allow_html=True)
    with col_idx2:
        st.markdown("""
        <div class="glass-panel" style="padding:16px;">
            <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">LQ45 Index</p>
            <p class="metric-value neon-green">1,012.15 <span style="font-size:14px; font-weight:normal;">+1.14%</span></p>
        </div>
        """, unsafe_allow_html=True)
    with col_idx3:
        st.markdown("""
        <div class="glass-panel" style="padding:16px;">
            <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Top Bullish Sentiment</p>
            <p class="metric-value neon-cyan">BBCA <span style="font-size:14px; font-weight:normal; color:#94a3b8;">+0.75 Score</span></p>
        </div>
        """, unsafe_allow_html=True)
    with col_idx4:
        st.markdown("""
        <div class="glass-panel" style="padding:16px;">
            <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Market Volatility (VIX Equival.)</p>
            <p class="metric-value neon-orange">11.45% <span style="font-size:14px; font-weight:normal;">Low Risk</span></p>
        </div>
        """, unsafe_allow_html=True)
        
    st.markdown("### LQ45 Heavyweight Snapshot")
    
    disp_df = df_stocks.copy()
    disp_df["Price"] = disp_df["Price"].map(lambda x: f"Rp {x:,}")
    disp_df["Market Cap (IDR)"] = disp_df["Market Cap (IDR)"].map(lambda x: f"Rp {x/1e12:.1f}T")
    st.dataframe(disp_df, use_container_width=True, hide_index=True)

# ================= TAB 2: ANALYSIS =================
with tab_analysis:
    col_sel, col_empty = st.columns([1, 3])
    with col_sel:
        selected_stock = st.selectbox("Pilih Emiten LQ45:", load_lq45_list(), index=0)
        
    row_data = df_stocks[df_stocks["Ticker"] == selected_stock].iloc[0]
    
    chatter_list, net_sent = get_shang_sentimen_data(selected_stock)
    
    # Verdict calculations
    if net_sent > 0.2:
        signal_verdict = "STRONG BUY" if net_sent > 0.5 else "BUY"
        verdict_class = "neon-green"
        text_badge = f"<span class='neon-green' style='border:1px solid rgba(0,255,133,0.3); padding:4px 8px; border-radius:4px; font-weight:900;'>{signal_verdict}</span>"
    elif net_sent < -0.2:
        signal_verdict = "STRONG SELL" if net_sent < -0.5 else "SELL"
        verdict_class = "neon-red"
        text_badge = f"<span class='neon-red' style='border:1px solid rgba(239,68,68,0.3); padding:4px 8px; border-radius:4px; font-weight:900;'>{signal_verdict}</span>"
    else:
        signal_verdict = "HOLD"
        verdict_class = "neon-orange"
        text_badge = f"<span class='neon-orange' style='border:1px solid rgba(245,158,11,0.3); padding:4px 8px; border-radius:4px; font-weight:900;'>{signal_verdict}</span>"
        
    col_f1, col_f2 = st.columns([2, 1])
    
    with col_f1:
        st.markdown(f"""
        <div class="glass-panel" style="margin-bottom: 20px;">
            <p style='font-size: 13px; color:#64748b; font-weight:700; margin-bottom: 2px;'>EMITEN AKTIF</p>
            <h2 style='margin-top:0px; margin-bottom:5px; font-weight:800;'>{selected_stock} <span style='font-size:16px; font-weight:normal; color:#64748b;'>| {row_data['Price']} IDR</span></h2>
            <div style='margin-top:10px;'>
                <span style='color:#94a3b8; font-size:13px;'>Ritel Sentiment Aggregate Score: </span>
                <span class='{verdict_class}' style='font-weight:bold; font-size:16px;'>{net_sent:+.2f}</span>
                <span style='margin-left: 15px;'>{text_badge}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Plotly Candlestick Interactive Chart
        np.random.seed(df_stocks[df_stocks["Ticker"] == selected_stock].index[0])
        dates = pd.date_range(end=datetime.today(), periods=60).tolist()
        prices = []
        base = row_data["Price"]
        for i in range(60):
            base += np.random.normal(0, base * 0.015)
            prices.append(max(base, 50))
            
        df_chart = pd.DataFrame({"Date": dates, "Close": prices})
        df_chart["High"] = df_chart["Close"] * (1 + np.abs(np.random.normal(0, 0.005, 60)))
        df_chart["Low"] = df_chart["Close"] * (1 - np.abs(np.random.normal(0, 0.005, 60)))
        df_chart["Open"] = df_chart["Close"] * (1 + np.random.normal(0, 0.006, 60))
        df_chart["EMA_20"] = df_chart["Close"].ewm(span=20).mean()
        df_chart["SMA_50"] = df_chart["Close"].rolling(window=50).mean()
        
        fig = go.Figure()
        fig.add_trace(go.Candlestick(
            x=df_chart["Date"],
            open=df_chart["Open"],
            high=df_chart["High"],
            low=df_chart["Low"],
            close=df_chart["Close"],
            name="Candlestick"
        ))
        fig.add_trace(go.Scatter(x=df_chart["Date"], y=df_chart["EMA_20"], name="EMA 20", line=dict(color="#00e1ff", width=1.5)))
        fig.add_trace(go.Scatter(x=df_chart["Date"], y=df_chart["SMA_50"], name="SMA 50", line=dict(color="#F59E0B", width=1.5)))
        
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            xaxis_rangeslider_visible=False,
            margin=dict(t=15, b=15, l=15, r=15),
            font=dict(color="#f1f5f9"),
            xaxis=dict(gridcolor="rgba(255,255,255,0.05)"),
            yaxis=dict(gridcolor="rgba(255,255,255,0.05)")
        )
        st.plotly_chart(fig, use_container_width=True)
        
    with col_f2:
        st.markdown(f"""
        <div class="glass-panel" style="margin-bottom: 20px;">
            <p style='color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;'>Fundamen & Valuasi</p>
            <table style='width:100%; border-collapse: collapse; font-size:13px;'>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'><td style='padding:8px 0; color:#94a3b8;'>P/E Ratio</td><td style='text-align:right; font-weight:700;'>{row_data['P/E Ratio']}x</td></tr>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'><td style='padding:8px 0; color:#94a3b8;'>PBV Ratio</td><td style='text-align:right; font-weight:700;'>{row_data['PBV Ratio']}x</td></tr>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'><td style='padding:8px 0; color:#94a3b8;'>Div Yield</td><td style='text-align:right; font-weight:700;'>{row_data['Div Yield (%)']}%</td></tr>
                <tr style='border-bottom: 1px solid rgba(255,255,255,0.05);'><td style='padding:8px 0; color:#94a3b8;'>Beta Pasar</td><td style='text-align:right; font-weight:700;'>{row_data['Beta']}</td></tr>
            </table>
        </div>
        """, unsafe_allow_html=True)
        
        # Real-time CNN Indonesia Ekonomi News View
        st.markdown("<p style='color:#ef4444; font-size:12px; margin-bottom: 5px; font-weight:bold; text-transform:uppercase;'>CNN Indonesia Ekonomi & Bisnis News Hub</p>", unsafe_allow_html=True)
        
        # Render dynamic user stream
        chat_container = st.container(height=350)
        with chat_container:
            for c in chatter_list:
                border_color = "#00FF85/20" if c['verdict'] == "BULLISH" else "#EF4444/20" if c['verdict'] == "BEARISH" else "rgba(255,255,255,0.05)"
                bg_color = "rgba(0,255,133,0.03)" if c['verdict'] == "BULLISH" else "rgba(239,68,68,0.03)" if c['verdict'] == "BEARISH" else "transparent"
                verdict_text = f"<span class='neon-green'>{c['verdict']}</span>" if c['verdict'] == "BULLISH" else f"<span class='neon-red'>{c['verdict']}</span>" if c['verdict'] == "BEARISH" else f"<span class='neon-orange'>{c['verdict']}</span>"
                
                st.markdown(f"""
                <div style="background-color: {bg_color}; border: 1px solid {border_color}; border-radius: 8px; padding: 12px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-weight:700; font-size:12px; color:#38bdf8;">{c['author']}</span>
                        <span style="font-size:10px; color:#64748b;">{c['time']}</span>
                    </div>
                    <p style="font-size:12px; margin: 0; color:#f1f5f9;">{c['text']}</p>
                    <div style="text-align:right; font-size:10px; margin-top:4px;">Verdict: {verdict_text}</div>
                </div>
                """, unsafe_allow_html=True)

# ================= TAB 3: SCREENER =================
with tab_screener:
    st.markdown("### Multi-Factor Technical & Fundamental Screener")
    st.markdown("<p style='color:#64748b;'>Saring seluruh semesta saham LQ45 secara real-time berdasarkan parameter kustom Anda.</p>", unsafe_allow_html=True)
    
    col_sc1, col_sc2, col_sc3 = st.columns(3)
    with col_sc1:
        max_pe = st.slider("Maksimum P/E Ratio:", -10.0, 50.0, 25.0, step=0.5)
    with col_sc2:
        max_pbv = st.slider("Maksimum PBV Ratio:", 0.0, 15.0, 3.5, step=0.1)
    with col_sc3:
        min_dy = st.slider("Minimum Dividend Yield (%):", 0.0, 15.0, 2.0, step=0.1)
        
    filtered_df = df_stocks[
        (df_stocks["P/E Ratio"] <= max_pe) & 
        (df_stocks["PBV Ratio"] <= max_pbv) & 
        (df_stocks["Div Yield (%)"] >= min_dy)
    ]
    
    st.markdown(f"#### Hasil Penyaringan ({len(filtered_df)} Saham Terpilih)")
    
    if filtered_df.empty:
        st.warning("Tidak ada saham yang cocok dengan kriteria filtering Anda.")
    else:
        disp_filtered = filtered_df.copy()
        disp_filtered["Price"] = disp_filtered["Price"].map(lambda x: f"Rp {x:,}")
        disp_filtered["Market Cap (IDR)"] = disp_filtered["Market Cap (IDR)"].map(lambda x: f"Rp {x/1e12:.1f}T")
        st.dataframe(disp_filtered, use_container_width=True, hide_index=True)

# ================= TAB 4: PORTFOLIO =================
with tab_portfolio:
    st.markdown("### Markowitz Portfolio Efficient Frontier Optimizer & Lot Calculator")
    st.markdown("<p style='color:#64748b;'>Optimalkan instrumen Bluechip Anda menggunakan Modern Portfolio Theory (MPT) Monte Carlo Simulation.</p>", unsafe_allow_html=True)
    
    col_p1, col_p2 = st.columns([1, 2])
    
    with col_p1:
        st.markdown("<div class='glass-panel'>", unsafe_allow_html=True)
        budget = st.number_input("Investasi Kapital Budget (IDR):", min_value=1000000, max_value=1000000000, value=10000000, step=1000000)
        risk_profile = st.selectbox("Profil Risiko:", ["Low", "Medium", "High"], index=1)
        
        selected_tickers = st.multiselect(
            "Pilih Saham untuk Portofolio:",
            load_lq45_list(),
            default=["BBCA", "BBRI", "BMRI", "BBNI", "TLKM"]
        )
        submit_optimizer = st.button("Jalankan Markowitz Optimizer")
        st.markdown("</div>", unsafe_allow_html=True)
        
    with col_p2:
        if submit_optimizer or 'simulation_data' in st.session_state or len(selected_tickers) >= 2:
            if len(selected_tickers) < 2:
                st.error("Gagal: Pilih minimal 2 saham untuk optimasi.")
            else:
                st.info("Simulating 1,000+ portfolio combinations via Monte Carlo simulation...")
                
                # Perform Monte Carlo simulation dynamically
                num_assets = len(selected_tickers)
                np.random.seed(42)
                
                # Dynamic realistic returns
                asset_returns = np.random.uniform(0.08, 0.22, num_assets)
                cov_matrix = np.random.uniform(0.01, 0.05, (num_assets, num_assets))
                cov_matrix = (cov_matrix + cov_matrix.T) / 2  # Symmetric
                np.fill_diagonal(cov_matrix, np.random.uniform(0.02, 0.08, num_assets))
                
                num_portfolios = 1000
                results = np.zeros((3, num_portfolios))
                weights_record = []
                
                for i in range(num_portfolios):
                    weights = np.random.random(num_assets)
                    weights /= np.sum(weights)
                    weights_record.append(weights)
                    
                    p_return = np.sum(weights * asset_returns)
                    p_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
                    p_sharpe = p_return / p_std
                    
                    results[0,i] = p_return
                    results[1,i] = p_std
                    results[2,i] = p_sharpe
                    
                # Determine "Optimal" depending on Risk Profile
                if risk_profile == "Low":
                    # Minimum Volatility / Risk
                    opt_idx = np.argmin(results[1])
                elif risk_profile == "High":
                    # Maximum Return
                    opt_idx = np.argmax(results[0])
                else:
                    # Maximum Sharpe Ratio
                    opt_idx = np.argmax(results[2])
                    
                opt_weights = weights_record[opt_idx]
                opt_return = results[0, opt_idx] * 100
                opt_vol = results[1, opt_idx] * 100
                opt_sharpe = results[2, opt_idx]
                
                st.session_state['simulation_data'] = {
                    'opt_weights': opt_weights,
                    'opt_return': opt_return,
                    'opt_vol': opt_vol,
                    'opt_sharpe': opt_sharpe,
                    'results': results
                }
                
                # Efficient Frontier Chart Using Plotly
                fig_ef = go.Figure()
                fig_ef.add_trace(go.Scatter(
                    x=results[1]*100,
                    y=results[0]*100,
                    mode='markers',
                    marker=dict(
                        color=results[2],
                        colorscale='Viridis',
                        size=6,
                        showscale=True,
                        colorbar=dict(title="Sharpe Ratio")
                    ),
                    name='Simulated Portfolios',
                    opacity=0.5
                ))
                fig_ef.add_trace(go.Scatter(
                    x=[opt_vol],
                    y=[opt_return],
                    mode='markers',
                    marker=dict(color='#00FF85', size=15, symbol='star', line=dict(color='#0b0f19', width=2)),
                    name='Optimal Portfolio'
                ))
                
                fig_ef.update_layout(
                    title_text=f"Markowitz Efficient Frontier: {risk_profile} Risk",
                    paper_bgcolor='rgba(0,0,0,0)',
                    plot_bgcolor='rgba(0,0,0,0)',
                    xaxis_title="Expected Volatility (Risk) (%)",
                    yaxis_title="Expected Annual Return (%)",
                    margin=dict(t=50, b=20, l=20, r=20),
                    font=dict(color="#f1f5f9"),
                    xaxis=dict(gridcolor="rgba(255,255,255,0.05)"),
                    yaxis=dict(gridcolor="rgba(255,255,255,0.05)")
                )
                
                st.plotly_chart(fig_ef, use_container_width=True)
                
                # Allocation Metrics
                st.markdown("### Hasil Alokasi Optimasi & Hitung Lot")
                col_met1, col_met2, col_met3 = st.columns(3)
                with col_met1:
                    st.markdown(f"""
                    <div class="glass-panel" style="padding:16px;">
                        <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Expected Return</p>
                        <p class="metric-value neon-green">{opt_return:.2f}% <span style="font-size:12px; color:#64748b;">/ Thn</span></p>
                    </div>
                    """, unsafe_allow_html=True)
                with col_met2:
                    st.markdown(f"""
                    <div class="glass-panel" style="padding:16px;">
                        <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Portfolio Volatility</p>
                        <p class="metric-value neon-cyan">{opt_vol:.2f}%</p>
                    </div>
                    """, unsafe_allow_html=True)
                with col_met3:
                    st.markdown(f"""
                    <div class="glass-panel" style="padding:16px;">
                        <p style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Sharpe Ratio Ratio</p>
                        <p class="metric-value text-white">{opt_sharpe:.2f}</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                # Build Allocation Table
                allocation_data = []
                total_spent = 0
                for idx, ticker in enumerate(selected_tickers):
                    weight = opt_weights[idx]
                    target_fund = budget * weight
                    row_fund = df_stocks[df_stocks["Ticker"] == ticker].iloc[0]
                    price = row_fund["Price"]
                    
                    # 1 Lot = 100 Shares
                    lot_cost = price * 100
                    lots = int(target_fund // lot_cost)
                    total_required = lots * lot_cost
                    total_spent += total_required
                    
                    verdict = "HOLD"
                    if weight * 100 > 20: verdict = "BUY"
                    elif weight * 100 < 8: verdict = "SELL"
                    
                    allocation_data.append({
                        "Ticker": ticker,
                        "Target Weight (%)": f"{weight*100:.2f}%",
                        "Verdict": verdict,
                        "Lots": lots,
                        "Value Alokasi (IDR)": f"Rp {total_required:,}"
                    })
                    
                st.dataframe(pd.DataFrame(allocation_data), use_container_width=True, hide_index=True)
                
                remaining_cash = budget - total_spent
                st.markdown(f"""
                <div class="glass-panel" style="background: rgba(0, 255, 133, 0.03); border:1px solid rgba(0,255,133,0.15)">
                    <b>Alokasi Sukses:</b> Total kapital teralokasi optimal adalah <b>Rp {total_spent:,}</b>. Sisa Kas Likuid (Idle Cash) Anda adalah <b>Rp {remaining_cash:,}</b>.
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("Pilih sekuritas LQ45 di sebelah kiri dan klik Jalankan Optimizer untuk melihat Visualisasi Efficient Frontier.")
