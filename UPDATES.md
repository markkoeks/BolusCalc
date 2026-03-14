# BolusCalc Updates

## 2026-03-14 (v4)

### Critical fixes
- Service worker now registered in both `index.html` and `calculator.html` -- offline mode actually works
- Replaced placeholder PWA icons (via.placeholder.com) with proper mint green bulb icons (192x192 and 512x512 PNGs)
- Fixed manifest colors: `background_color` and `theme_color` both set to `#1D9E75` (was dark blue `#2c3e50`)
- Service worker bumped to v4, caches new icon files, cleans up old caches on activation

### IOB accuracy: curve-based absorption model
- Replaced linear IOB decay with Walsh/exponential model (same as Loop/OpenAPS)
- Added `INSULIN_PROFILES` lookup table with insulin-specific peak times and default DIA values
- Supported insulins: NovoRapid, Humalog, Apidra, Admelog (standard rapid, peak ~1.25h), Fiasp (ultra-rapid, peak 0.6h), Lyumjev (ultra-rapid, peak 0.5h)
- IOB curve formula uses time constant `tau` derived from peak time, producing realistic rise-peak-tail pharmacokinetics
- "Other rapid-acting" fallback uses standard rapid parameters
- Insulin type dropdown now shows absorption speed labels (e.g. "Fiasp (Ultra-rapid)")
- Changing insulin type suggests updating DIA to match the insulin's default

### Time-aware carb ratios
- Ratios now stored as objects with `ratio`, `label`, `startHour`, and `endHour` fields
- Automatic migration: existing plain number arrays converted to new format on load
- Current time-of-day ratio auto-highlighted in the results view
- Settings: each ratio row now has a label input and optional start/end hour fields
- Wizard: ratio rows include a label input for naming (e.g. "Breakfast", "Lunch")

### Branding and trust
- Calculator header updated: "BolusCalc" (one word) with logo icon and back-link to landing page
- Landing page: new "About the developer" section before the footer
- Consistent naming across all pages

### Accessibility
- Removed `maximum-scale=1.0, user-scalable=no` from calculator viewport -- pinch-to-zoom now works
- Landing page: replaced `div.section-title` with semantic `<h2>`, feature/step titles with `<h3>`
- Added `aria-hidden="true"` to all decorative SVGs on the landing page

### Calculator UX
- Empty history state: shows "No boluses logged yet" instead of blank space
- Removed "+ Add Ratio" button from main calculator screen (ratio management consolidated in Settings only)
- Inline ratio editing still works on the main screen for quick tweaks
- Helper text added to insulin type dropdown: "Used to calculate how quickly your insulin is absorbed"

---

## 2026-03-14

### Landing page
- New public-facing landing page at the root URL (`index.html`)
- Calculator moved to `calculator.html`
- Sections: hero with CTAs, authenticity band, feature grid, how-it-works steps, privacy note, install instructions, feedback link, disclaimer
- Separate `landing.css` stylesheet to keep calculator bundle lean
- PWA `start_url` updated to `calculator.html` so installed app opens directly to the calculator
- Service worker cache bumped to v3, now caches both pages and both stylesheets

### Community feedback form
- Integrated Tally feedback form for feature suggestions, bug reports, and general feedback
- Landing page: dedicated "Got a suggestion?" section with CTA button
- Calculator: subtle "Share feedback" link in the footer
- Opens in new tab to keep users in the app

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
