# 🧠 EEG Mind Analyzer

An interactive, deep brainwave analysis dashboard built with **Next.js**, **React**, **Tailwind CSS**, and **Recharts**.

Designed specifically to parse, filter, analyze, and visualize raw EEG recordings exported from the **Mind Monitor** mobile application (for Interaxon **Muse 2** and **Muse S** headbands).

![EEG Mind Analyzer Dashboard](public/sample_session.csv)

---

## ✨ Features & Capabilities

### 1. 🛡️ Deep Noise Filtering & Artifact Compensation
- **Logarithmic Bels to Microvolt Power Conversion:** Converts raw Bels values to absolute linear power ($\mu V^2 = 10^{\text{Bels}}$) following Interaxon Muse official specifications.
- **Sensor Quality Filtering (HSI):** Automatically screens out sample frames with loose sensor contact ($\text{HSI} \ge 3$ or $\text{HeadBandOn} == 0$).
- **Muscle & Motion Artifact Detection:** Flags eye blinks, jaw clenches, and high-G movement spikes derived from Muse accelerometer and gyroscope sensors.
- **Configurable Smoothing Filter:** Real-time sliding window Gaussian/moving-average smoothing (1s Raw, 3s Balanced, 5s Smooth, 10s Heavy Trend).

### 2. 📊 Science-Backed Cognitive Metrics & State Scores
- **Focus / Concentration Score ($\beta / [\alpha + \theta]$):** Measures executive function, active thinking, and mental engagement.
- **Tranquility / Calm Score ($\alpha$ Power & $\alpha / \beta$):** Tracks relaxed alertness without sleepiness.
- **Meditation Depth Score ($[\theta + \alpha] / \beta$):** Quantifies deep inner stillness and Alpha-Theta synergy.
- **Frontal Alpha Asymmetry (FAA):** Calculates hemispheric power balance ($\ln(\text{AF8}_\alpha) - \ln(\text{AF7}_\alpha)$) to detect emotional approach vs. withdrawal motivation.

### 3. 📈 Interactive Time-Based Visualizations
- **Relative Band Spectrum:** Stacked area timeline showing second-by-second power distribution between Delta, Theta, Alpha, Beta, and Gamma waves.
- **Dual-Metric Timelines:** Pan & zoom brush controls for Focus vs. Calm trends over time.
- **Channel-by-Channel Power Analysis:** Inspect raw values across `AF7` (Left Forehead), `AF8` (Right Forehead), `TP9` (Left Ear), and `TP10` (Right Ear).
- **Heart Rate Sync:** Automatically plots PPG heart rate alongside brainwaves when recorded.

### 4. 🔁 Real-time Frame Scrubber & Head Map Visualizer
- Replay your recording second-by-second with playback controls (1x, 2x, 5x, 10x speed).
- Interactive 4-sensor head graphic displaying live sensor contact quality and activity heatmap.

### 5. 🤖 Bring-Your-Own-Key (BYOK) AI Agent Deep Analysis
- Connect your own API key (**OpenAI**, **Anthropic Claude**, **Google Gemini**, **OpenRouter**, or **Groq**).
- **100% Client-Side & Private:** Your API key is stored strictly in your browser's `localStorage` and never transmitted to any third-party server.
- Generates evidence-backed neurofeedback insights, session phase breakdowns, and actionable recommendations.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0 or higher
- **npm** or **pnpm** / **yarn**

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/eeg-mind-analyzer.git
cd eeg-mind-analyzer

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📥 How to Get Your CSV Data from Mind Monitor

1. Wear your **Muse 2** or **Muse S** headband and connect it to the **Mind Monitor** mobile app.
2. Complete your meditation, focus session, or recording.
3. Tap **Export CSV** in Mind Monitor or send the generated `.csv` file to your computer.
4. Drag and drop the CSV into the **EEG Mind Analyzer** app!

---

## 📄 Mind Monitor CSV Data Schema

The app parses the official Mind Monitor export format:
- `TimeStamp`: ISO date string or epoch timestamp
- `Delta_*`, `Theta_*`, `Alpha_*`, `Beta_*`, `Gamma_*`: Logarithmic band powers in Bels across `TP9`, `AF7`, `AF8`, `TP10`.
- `HSI_*`: Horseshoe Sensor Quality Indicator ($1 = \text{Good}, 2 = \text{OK}, 3/4 = \text{Bad}$).
- `HeadBandOn`: Binary contact flag ($1 = \text{On}, 0 = \text{Off}$).
- `Accelerometer_*`, `Gyro_*`, `PPG_*`: Auxiliary inertial and heart rate metrics.

---

## 🛠️ Built With

- [Next.js 16](https://nextjs.org/) - React Framework
- [Recharts](https://recharts.org/) - Interactive Charts
- [PapaParse](https://www.papaparse.com/) - Fast CSV Parser
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling & Responsive Layout
- [Lucide React](https://lucide.dev/) - Modern UI Icons

---

## 📜 License

MIT License. Free for personal, academic, and commercial use.
