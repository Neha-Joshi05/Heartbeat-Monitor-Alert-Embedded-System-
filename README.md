# ❤️ Heartbeat Monitor with Alert System

**Embedded Systems + React Telemetry Dashboard** — a pulse-sensor-based heart rate monitor with configurable threshold alerts, built as real Arduino/ESP32 firmware **and** a live, interactive React dashboard.

![status](https://img.shields.io/badge/status-active-brightgreen) ![react](https://img.shields.io/badge/react-19-61DAFB) ![tailwind](https://img.shields.io/badge/tailwindcss-3-38BDF8) ![arduino](https://img.shields.io/badge/arduino-C%2FC%2B%2B-00979D) ![render](https://img.shields.io/badge/deployed-render-46E3B7)

**🔴 Live demo:** *(add your Render static site URL here after deploying)*

---

## ⚠️ Educational Medical Disclaimer

**This is an educational embedded systems prototype — not a certified medical diagnostic device.** Readings from hobby-grade pulse sensors are approximate and must not be used to make medical decisions. Clinical heart-rate interpretation varies by age, health condition, activity level, and medication, and requires a licensed professional. The thresholds in this project are demonstration settings only.

---

## 📌 Overview

This project continuously monitors heart rate using a pulse sensor and a microcontroller (Arduino/ESP32), calculates BPM (beats per minute) from the time between detected heartbeats, and triggers a visual + audible alert when the reading falls outside a configurable safe range. It's built both as real hardware firmware and as a fully interactive, browser-based telemetry dashboard so it can be demoed without any hardware.

## 🏭 Industry Relevance

Continuous heart-rate monitoring underpins products from Fitbit, Apple Watch, and Oura to clinical remote-patient-monitoring platforms used by Philips Healthcare and Medtronic. The same core pipeline shown here — sensor acquisition → signal processing → BPM calculation → threshold-based alerting → display — is the foundation of wearable fitness trackers, patient monitoring systems, and rehabilitation devices.

## ✨ Features

**Dashboard**
- Live BPM waveform chart with threshold reference lines
- Status badge: `NORMAL` (60–100 BPM) / `CRITICAL HIGH` (>100 BPM) / `CRITICAL LOW` (<60 BPM)
- Animated current-BPM card with pulsing heart icon
- Peak / lowest BPM tracking for the session
- Simulated ESP32 connection status with live/reconnecting indicator
- System uptime clock + last-sync timestamp
- Configurable low/high alert thresholds via sliders
- Flashing alert banner on abnormal readings
- Buzzer/LED mute toggle + manual test-alert trigger
- Filterable, timestamped telemetry log (All Logs / Alert Logs)

**Firmware**
- Analog pulse sensor reading with peak/edge detection
- Refractory-period debounce to prevent double-counting one beat
- BPM = 60000 ÷ average beat interval (ms), smoothed over multiple beats
- 16x2 LCD status display
- Buzzer + red/green LED threshold alerts
- Serial Monitor telemetry output

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (functional components + hooks) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | lucide-react |
| Build tool | Vite |
| Firmware | Embedded C / Arduino |
| Hardware (Option B) | Arduino UNO / ESP32, analog Pulse Sensor, 16x2 LCD, buzzer, red/green LEDs |

## 🧩 Architecture

```
Pulse Sensor (analog signal)
        ↓
Microcontroller (ADC sampling)
        ↓
Heartbeat Peak Detection (debounced)
        ↓
BPM Calculation (60000 / beat interval, smoothed)
        ↓
Threshold Comparison (configurable low/high)
        ↓
   ┌────┴────┐
 NORMAL     LOW/HIGH
   ↓            ↓
Green LED   Red LED + Buzzer
   ↓            ↓
      16x2 LCD Display
```

## 🔌 Circuit Connections (Option B — Recommended)

| Component | Pin | Connects to |
|---|---|---|
| Pulse Sensor | Signal | Arduino A0 |
| Pulse Sensor | VCC / GND | 5V / GND |
| Buzzer | + | Digital pin 8 |
| Red LED | Anode (via 220Ω resistor) | Digital pin 9 |
| Green LED | Anode (via 220Ω resistor) | Digital pin 10 |
| 16x2 LCD | RS, EN, D4–D7 | Pins 7, 6, 5, 4, 3, 2 |

Full firmware: [`arduino_code/heartbeat_monitor.ino`](./arduino_code/heartbeat_monitor.ino)

## 📐 BPM Calculation

```
BPM = 60,000 / Time Between Two Beats (ms)
```

| Beat interval | BPM |
|---|---|
| 1000 ms | 60 |
| 750 ms | 80 |
| 600 ms | 100 |

Averaging multiple beat intervals (this project uses the last 4) smooths out noise from finger movement or poor sensor contact, preventing false single-beat BPM spikes.

## 💻 Running the Dashboard Locally

```bash
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

### NPM packages used

```bash
npm install lucide-react recharts
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

## ☁️ Deploy on Render (Static Site)

1. Push this repo to GitHub.
2. On [render.com](https://render.com) → **New +** → **Static Site** → connect the repo.
3. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Deploy, then paste your `.onrender.com` URL into the **Live demo** line at the top of this README.

## 🧪 Virtual Simulation (Hardware-Free)

If you don't have physical hardware, simulate the exact same logic in [Wokwi](https://wokwi.com):
1. Create a new Arduino Uno project.
2. Add a potentiometer as a stand-in signal source for the pulse sensor (or use Wokwi's pulse sensor part if available).
3. Add a 16x2 LCD, buzzer, and red/green LEDs, wired per the table above.
4. Paste `arduino_code/heartbeat_monitor.ino`.
5. Run the simulation and sweep the potentiometer to simulate low, normal, and high BPM readings.
6. Confirm the LCD, LEDs, buzzer, and Serial Monitor all respond correctly at each threshold.

Capture screenshots of: the Wokwi circuit, Serial Monitor output at each BPM range, and the LCD display for your GitHub proof.

## 📁 Folder Structure

```
Heartbeat-Monitor-Alert-Embedded-System/
├── frontend/                      # React + Tailwind + Recharts dashboard
│   ├── src/App.jsx                # Complete dashboard component
│   ├── package.json
│   └── ...
├── arduino_code/
│   └── heartbeat_monitor.ino      # Real hardware firmware
├── simulation/                    # Wokwi/virtual simulation notes
├── circuit_diagram/
├── data/
├── outputs/
├── screenshots/
├── reports/
├── docs/
└── README.md
```

## 🧪 Test Cases

| Scenario | Input | Expected Output |
|---|---|---|
| No pulse detected | No finger on sensor | LCD: "No pulse signal", all outputs off |
| Normal pulse | ~72 BPM | Green LED ON, buzzer OFF, status NORMAL |
| Low BPM | <60 BPM | Red LED ON, buzzer ON, status LOW |
| High BPM | >100 BPM | Red LED ON, buzzer ON, status HIGH |
| Noisy signal | Rapid finger movement | Debounce prevents false double-counted beats |
| Sensor disconnect | Signal lost >3s | BPM resets to 0, "No pulse signal" shown |

## 🚀 Limitations & Future Improvements

- Hobby-grade analog pulse sensor is sensitive to motion artifacts and poor contact.
- Upgrade path: MAX30102 sensor (I2C, more stable), SpO2 monitoring, ESP32 Wi-Fi + MQTT for a real cloud dashboard, historical trend storage, and Blynk mobile app integration.

## 🎓 Learning Outcomes

Sensor interfacing, analog signal acquisition, peak/edge detection, timer-based (non-blocking) BPM calculation, threshold-based embedded decision logic, LCD display interfacing, alert generation, and building a production-style React telemetry dashboard on top of embedded sensor data.

---
👤 Author
NEHA JOSHI 
[GitHub] https://github.com/Neha-Joshi05/Heartbeat-Monitor-Alert-Embedded-System-.git | [LinkedIn] https://www.linkedin.com/in/neha-joshi-0851a2322?utm_source=share_via&utm_content=profile&utm_medium=member_android
