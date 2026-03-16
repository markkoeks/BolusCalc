# BolusCalc

A fast, offline-first insulin bolus calculator PWA for Type 1 diabetics who self-manage.

## Features

- **Live Carb Summing:** Type expressions like `5+3+10` and see the total (`= 18g`) update in real-time.
- **Multiple Bolus Ratios:** Configure up to 6 carb ratios with labels (e.g. Breakfast 1:10, Lunch 1:12) and see calculated doses for all of them simultaneously.
- **Custom Bolus Logging:** Log any dose directly for IOB tracking — not just the calculated one.
- **Curve-Based IOB:** Insulin on board calculated using the Walsh/exponential model (same as Loop/OpenAPS), with insulin-type-aware absorption profiles.
- **Two IOB Modes:** **Auto** (tracks IOB from logged boluses) or **Manual** (enter units and hours ago).
- **7-Step Setup Wizard:** Guided onboarding for units, ratios, ISF, target BG, DIA, and insulin type.
- **Dark Mode:** System-preference-aware with manual toggle.
- **Instant Load:** Cache-first Service Worker for sub-second startup.
- **Offline-First:** Works with zero internet connection after the initial visit.
- **Privacy-Focused:** No accounts, no backend, no cookies. All data stays on your device via localStorage.
- **PWA Ready:** Installable to the home screen with platform-specific install prompts.
- **European Locale Support:** Comma decimal separators handled automatically.

## Calculation Logic

The app uses standard formulas for T1D bolus calculation:

- **Carb Bolus** = `Carbohydrates / Carb Ratio`
- **Correction Bolus** = `(Current BG - Target BG) / ISF` (0 if BG is below target)
- **IOB** = Walsh/exponential curve decay over Duration of Insulin Action (DIA), with peak time based on insulin type
- **Total Dose** = `max(0, Carb Bolus + Correction Bolus - IOB)`
- **Rounded Dose** = Total dose rounded to the nearest **0.5 units**

Supported insulin profiles: NovoRapid, Humalog, Apidra, Fiasp, Lyumjev, Admelog, and a generic rapid-acting option.

## Technical Stack

- **HTML5 / CSS3:** Mobile-first card-based layout with large touch targets.
- **Vanilla JavaScript:** Zero dependencies or frameworks. Single `app.js` file.
- **Web Storage API:** `localStorage` for persisting settings, ratios, and bolus history.
- **Service Workers:** Offline functionality and caching.
- **Vercel:** Auto-deploys from `main` branch. Privacy-friendly Web Analytics.

## Project Structure

```
BolusCalc/
├── index.html          # Landing page
├── calculator.html     # Main calculator app
├── app.js              # All calculator logic
├── style.css           # Calculator styles (incl. dark mode)
├── landing.css         # Landing page styles
├── manifest.json       # PWA manifest
├── service-worker.js   # Cache-first SW for offline support
└── icons/              # PWA icons (192px, 512px)
```

## Setup

No build step, no package manager, no dependencies.

```bash
# Local development — just open the file or use any static server
open calculator.html
npx serve .
```

### To Install on Your Phone

1. Open the URL in **Chrome** (Android) or **Safari** (iOS).
2. **Android:** Tap the install prompt, or use the three-dot menu > **"Install app"**.
3. **iOS:** Tap the share button > **"Add to Home Screen"**.
4. The app will work without internet after the first visit.

## Disclaimer

**This application is a calculation aid only and does not provide medical advice.** The user assumes all responsibility for verifying the accuracy of calculations before administering insulin. Always consult with a healthcare professional regarding diabetes management.

## License

This project is open-source and available under the MIT License.
