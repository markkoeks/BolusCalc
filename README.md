# Bolus Calc PWA

A minimalist, offline-first insulin bolus calculator built for speed and simplicity.

## Features
- **Live Carb Summing:** Type expressions like `5+3+10` and see the total (`= 18g`) update in real-time.
- **Multiple Bolus Ratios:** Configure multiple carb ratios (e.g., 1:8, 1:10, 1:12, 1:15) and see calculated doses for all of them simultaneously. Tap a ratio to edit it inline.
- **Insulin On Board (IOB):** Two modes — **Auto** (tracks IOB from logged boluses using linear decay) or **Manual** (enter units given and hours ago to calculate remaining insulin).
- **Instant Load:** Cache-first Service Worker for sub-second startup.
- **Offline-First:** Works with zero internet connection after the initial visit.
- **Privacy-Focused:** No accounts, no backend, no tracking, no analytics. All data stays on your device.
- **PWA Ready:** Installable to the home screen for a native app experience.

## Calculation Logic
The app uses standard formulas for T1D bolus calculation:
- **Carb Bolus** = `Carbohydrates / Carb Ratio`
- **Correction Bolus** = `(Current BG - Target BG) / ISF` (0 if BG is below target)
- **IOB** = Linear decay over Duration of Insulin Action (DIA)
- **Total Dose** = `max(0, Carb Bolus + Correction Bolus - IOB)`
- **Rounded Dose** = Total dose rounded to the nearest **0.5 units**

Results are calculated for every configured ratio simultaneously, so you can compare doses at different sensitivity levels at a glance.

## Technical Stack
- **HTML5 / CSS3:** Mobile-first card-based layout with large touch targets.
- **Vanilla JavaScript:** Zero dependencies or frameworks.
- **Web Storage API:** `localStorage` for persisting settings, ratios, and bolus history.
- **Service Workers:** Offline functionality and caching.

## Installation & Hosting

### To Host (via GitHub Pages):
1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, `app.js`, `manifest.json`, and `service-worker.js`.
3. In GitHub, go to **Settings > Pages**.
4. Select `Deploy from a branch` and choose `main`.
5. Your site will be live at `https://your-username.github.io/your-repo-name/`.

### To Install on Your Phone:
1. Open the URL in **Chrome** (Android) or **Safari** (iOS).
2. Wait for the page to load.
3. **Android:** Tap the three-dot menu > **"Install app"** or **"Add to Home Screen"**.
4. **iOS:** Tap the share button > **"Add to Home Screen"**.
5. The icon will appear on your home screen and work without internet.

## Disclaimer
**This application is a calculation aid only and does not provide medical advice.** The user assumes all responsibility for verifying the accuracy of calculations before administering insulin. Always consult with a healthcare professional regarding diabetes management.

## License
This project is open-source and available under the MIT License.
