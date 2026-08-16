/*
  Heartbeat Monitor with Alert System
  Tier: Option B (Recommended) - Arduino UNO / ESP32
  Hardware: Analog Pulse Sensor, 16x2 LCD, Buzzer, Red/Green LEDs

  Modules (per project spec):
  A. Pulse Reading      - raw analog signal acquisition
  B. Heartbeat Detection - peak detection with debounce (no double counting)
  C. BPM Calculation    - 60000 / beat interval (ms), smoothed over N beats
  D. Alert Logic        - configurable low/high threshold comparison
  E. Display            - 16x2 LCD status output
  F. Integrated loop    - ties all modules together + Serial output

  ---------------------------------------------------------------
  IMPORTANT: This is an educational embedded systems prototype.
  It is NOT a certified medical diagnostic device. Hobby-grade
  pulse sensor readings may be approximate and must not be used
  for medical decisions.
  ---------------------------------------------------------------
*/

#include <LiquidCrystal.h>

// ---------- Configuration ----------
const int THRESHOLD_LOW = 60;     // BPM below this = LOW alert (demo threshold)
const int THRESHOLD_HIGH = 100;   // BPM above this = HIGH alert (demo threshold)
const int SIGNAL_THRESHOLD = 550; // Analog value above which we consider it a "beat" (tune per sensor/finger)
const int SAMPLE_COUNT_AVG = 4;   // Number of beat intervals averaged for smoothing

// ---------- Pins ----------
const int PULSE_PIN = A0;
const int BUZZER_PIN = 8;
const int RED_LED_PIN = 9;
const int GREEN_LED_PIN = 10;
const int LCD_RS = 7, LCD_EN = 6, LCD_D4 = 5, LCD_D5 = 4, LCD_D6 = 3, LCD_D7 = 2;

LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

// ---------- State ----------
unsigned long lastBeatTime = 0;
bool signalWasHigh = false;
int beatIntervals[SAMPLE_COUNT_AVG];
int intervalIndex = 0;
int intervalsCollected = 0;
int currentBPM = 0;
unsigned long lastDisplayUpdate = 0;

// =====================================================================
// A. PULSE READING MODULE
// =====================================================================
int readPulseSignal() {
  return analogRead(PULSE_PIN);
}

// =====================================================================
// B. HEARTBEAT DETECTION MODULE
//    Simple rising-edge peak detection with a refractory period to
//    avoid double-counting a single physical beat.
// =====================================================================
bool detectHeartbeat(int signalValue) {
  const unsigned long REFRACTORY_MS = 300; // ~200 BPM max, prevents double count
  unsigned long now = millis();

  bool isHigh = signalValue > SIGNAL_THRESHOLD;

  if (isHigh && !signalWasHigh && (now - lastBeatTime) > REFRACTORY_MS) {
    signalWasHigh = true;
    unsigned long interval = now - lastBeatTime;
    lastBeatTime = now;

    // First detected beat has no valid interval yet
    if (interval < 2000 && interval > 0) {
      beatIntervals[intervalIndex] = interval;
      intervalIndex = (intervalIndex + 1) % SAMPLE_COUNT_AVG;
      if (intervalsCollected < SAMPLE_COUNT_AVG) intervalsCollected++;
      return true;
    }
  } else if (!isHigh) {
    signalWasHigh = false;
  }
  return false;
}

// =====================================================================
// C. BPM CALCULATION MODULE
//    BPM = 60000 / average beat interval (ms)
// =====================================================================
int calculateBPM() {
  if (intervalsCollected == 0) return 0;

  long sum = 0;
  for (int i = 0; i < intervalsCollected; i++) {
    sum += beatIntervals[i];
  }
  int avgInterval = sum / intervalsCollected;
  if (avgInterval <= 0) return 0;

  return 60000 / avgInterval;
}

// =====================================================================
// D. ALERT MODULE
// =====================================================================
enum AlertStatus { STATUS_NORMAL, STATUS_LOW, STATUS_HIGH, STATUS_NO_SIGNAL };

AlertStatus evaluateAlert(int bpm) {
  if (bpm == 0) return STATUS_NO_SIGNAL;
  if (bpm < THRESHOLD_LOW) return STATUS_LOW;
  if (bpm > THRESHOLD_HIGH) return STATUS_HIGH;
  return STATUS_NORMAL;
}

void applyAlertOutputs(AlertStatus status) {
  switch (status) {
    case STATUS_NORMAL:
      digitalWrite(GREEN_LED_PIN, HIGH);
      digitalWrite(RED_LED_PIN, LOW);
      digitalWrite(BUZZER_PIN, LOW);
      break;
    case STATUS_LOW:
    case STATUS_HIGH:
      digitalWrite(GREEN_LED_PIN, LOW);
      digitalWrite(RED_LED_PIN, HIGH);
      digitalWrite(BUZZER_PIN, HIGH);
      break;
    case STATUS_NO_SIGNAL:
      digitalWrite(GREEN_LED_PIN, LOW);
      digitalWrite(RED_LED_PIN, LOW);
      digitalWrite(BUZZER_PIN, LOW);
      break;
  }
}

// =====================================================================
// E. DISPLAY MODULE
// =====================================================================
void updateDisplay(int bpm, AlertStatus status) {
  lcd.clear();
  lcd.setCursor(0, 0);
  if (status == STATUS_NO_SIGNAL) {
    lcd.print("No pulse signal");
  } else {
    lcd.print("BPM: ");
    lcd.print(bpm);
  }
  lcd.setCursor(0, 1);
  switch (status) {
    case STATUS_NORMAL:    lcd.print("Status: NORMAL"); break;
    case STATUS_LOW:       lcd.print("Status: LOW!");   break;
    case STATUS_HIGH:      lcd.print("Status: HIGH!");  break;
    case STATUS_NO_SIGNAL: lcd.print("Place finger..."); break;
  }
}

// =====================================================================
// F. SETUP + MAIN LOOP
// =====================================================================
void setup() {
  Serial.begin(115200);
  lcd.begin(16, 2);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);

  lcd.print("Heartbeat Mon.");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1500);
}

void loop() {
  int signalValue = readPulseSignal();
  bool beatDetected = detectHeartbeat(signalValue);

  if (beatDetected) {
    currentBPM = calculateBPM();
  }

  // Signal considered lost if no beat for 3 seconds
  if (millis() - lastBeatTime > 3000) {
    currentBPM = 0;
    intervalsCollected = 0;
  }

  AlertStatus status = evaluateAlert(currentBPM);
  applyAlertOutputs(status);

  // Update LCD roughly twice a second (avoid flicker)
  if (millis() - lastDisplayUpdate > 500) {
    updateDisplay(currentBPM, status);
    lastDisplayUpdate = millis();
  }

  // Serial monitor output for debugging / logging
  Serial.print("Raw:");
  Serial.print(signalValue);
  Serial.print("  BPM:");
  Serial.print(currentBPM);
  Serial.print("  Status:");
  switch (status) {
    case STATUS_NORMAL:    Serial.println("NORMAL"); break;
    case STATUS_LOW:       Serial.println("LOW");    break;
    case STATUS_HIGH:      Serial.println("HIGH");   break;
    case STATUS_NO_SIGNAL: Serial.println("NO_SIGNAL"); break;
  }

  delay(20); // ~50Hz sampling rate
}
