# BolusCalc Updates

## 2026-03-14

### Input validation — carbs and BG fields
- Carbs field now only accepts digits, `.`, and `+` (for math expressions)
- BG field only accepts digits and `.`
- Invalid characters are stripped in real-time on input, paste, and autofill

### User settings screen
- Replaced the inline collapsible settings card with a full-screen settings overlay
- Gear icon in the header opens the settings screen
- Settings summary card on the main calculator shows Target, ISF, DIA, and Units at a glance (tap to open full settings)
- Settings include: Units (mmol/L or mg/dL), Target BG, ISF, Carb Ratios (add/edit/remove), DIA, Insulin Type dropdown
- Unit toggle auto-converts Target and ISF values when switching between mmol/L and mg/dL
- Validation: Target and ISF must be positive, DIA constrained to 2-8 hours
- Reset All Settings button with confirmation dialog
- All values persist in localStorage

### First-launch onboarding wizard
- 7-step guided setup: Welcome > Units > Carb Ratios > Correction Factor > Target Glucose > Active Insulin Time > Done
- Educational helper text on each step explaining what each setting means
- Step counter ("Step X of 7") and animated progress bar
- DIA preset buttons (3h / 4h / 5h) plus Custom option for other values
- Confirmation screen with "Start Calculating" button
- Skippable: "Skip for now" button closes wizard and shows a persistent setup-incomplete banner
- Banner is tappable to resume wizard, or dismissible via X button
- Re-entrant: "Redo Setup Wizard" button in the settings screen
- Pre-populates current values when re-entering the wizard

### Medical disclaimer
- One-time disclaimer modal shown on first launch (before onboarding wizard) with "I understand" confirmation
- Footer note is now tappable -- opens a full About screen with the complete disclaimer and app description
- About screen also explains that all data is stored locally (no server)
- Disclaimer acceptance persisted in localStorage so it only shows once

### PWA install prompt
- Subtle install banner appears after 10 seconds or on first user interaction
- Android Chrome: triggers native `beforeinstallprompt` with an Install button
- iOS Safari: shows manual instruction ("Tap the Share button, then Add to Home Screen")
- Other browsers: shows a hint to use the browser menu
- Dismissible with 7-day cooldown (does not reappear until cooldown expires)
- Detects standalone mode and `appinstalled` event -- never shows once installed
- Install state persisted via `pwaInstalled` in localStorage
