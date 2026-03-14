// --- State ---
let ratios = JSON.parse(localStorage.getItem('ratios')) || null;
let selectedRatioIndex = parseInt(localStorage.getItem('selectedRatioIndex')) || 0;
let bolusHistory = JSON.parse(localStorage.getItem('bolusHistory')) || [];
let iobMode = localStorage.getItem('iobMode') || 'auto';

// User settings (persisted to localStorage)
const settings = {
    units: localStorage.getItem('units') || 'mmol',
    targetBg: parseFloat(localStorage.getItem('targetBg')) || 5.5,
    isf: parseFloat(localStorage.getItem('isf')) || 2.0,
    dia: parseFloat(localStorage.getItem('dia')) || 4,
    insulinType: localStorage.getItem('insulinType') || '',
    setupComplete: localStorage.getItem('setupComplete') === 'true'
};

// Migration from old single carbRatio
if (!ratios) {
    const oldRatio = parseFloat(localStorage.getItem('carbRatio'));
    ratios = oldRatio ? [oldRatio] : [8, 10, 12, 15];
    localStorage.removeItem('carbRatio');
    localStorage.setItem('ratios', JSON.stringify(ratios));
}

// Clamp selectedRatioIndex
if (selectedRatioIndex >= ratios.length) selectedRatioIndex = 0;

// --- DOM refs ---
const el = {
    currentBg: document.getElementById('currentBg'),
    carbs: document.getElementById('carbs'),
    bgSum: document.getElementById('bgSum'),
    carbsSum: document.getElementById('carbsSum'),
    iobValueAuto: document.getElementById('iobValueAuto'),
    iobValueManual: document.getElementById('iobValueManual'),
    iobAutoPanel: document.getElementById('iobAutoPanel'),
    iobManualPanel: document.getElementById('iobManualPanel'),
    manualUnits: document.getElementById('manualUnits'),
    manualHoursAgo: document.getElementById('manualHoursAgo'),
    ratioResults: document.getElementById('ratioResults'),
    addRatioBtn: document.getElementById('addRatioBtn'),
    historyList: document.getElementById('historyList'),
    addBolusBtn: document.getElementById('addBolusBtn'),
    // Settings summary
    settingsSummary: document.getElementById('settingsSummary'),
    summaryTarget: document.getElementById('summaryTarget'),
    summaryIsf: document.getElementById('summaryIsf'),
    summaryDia: document.getElementById('summaryDia'),
    summaryUnits: document.getElementById('summaryUnits'),
};

// --- Math evaluator (YNAB-style) ---
function solve(str) {
    if (!str || typeof str !== 'string') return 0;
    try {
        const clean = str.replace(/[^-()\d/*+.]/g, '');
        if (!clean) return 0;
        const result = Function(`'use strict'; return (${clean})`)();
        return isFinite(result) ? result : 0;
    } catch (e) {
        return 0;
    }
}

// --- IOB Calculations ---
function calculateHistoryIOB() {
    const diaHours = settings.dia || 4;
    const now = Date.now();
    let totalIOB = 0;

    bolusHistory = bolusHistory.filter(entry => {
        const ageHours = (now - entry.timestamp) / 3600000;
        if (ageHours < diaHours) {
            totalIOB += (entry.amount / diaHours) * (diaHours - ageHours);
            return true;
        }
        return false;
    });

    return totalIOB;
}

function calculateManualIOB() {
    const units = parseFloat(el.manualUnits.value) || 0;
    const hoursAgo = parseFloat(el.manualHoursAgo.value) || 0;
    const diaHours = settings.dia || 4;

    if (units <= 0 || hoursAgo >= diaHours) return 0;
    return (units / diaHours) * (diaHours - hoursAgo);
}

// --- Main Calculation ---
function calculate() {
    const bg = solve(el.currentBg.value);
    const carbs = solve(el.carbs.value);
    const target = settings.targetBg;
    const isf = settings.isf || 1;

    // IOB
    const historyIOB = calculateHistoryIOB();
    const manualIOB = calculateManualIOB();
    const iob = iobMode === 'manual' ? manualIOB : historyIOB;

    el.iobValueAuto.textContent = historyIOB.toFixed(2) + ' u';
    el.iobValueManual.textContent = manualIOB.toFixed(2) + ' u';

    // Update sum badges
    updateSumBadge(el.currentBg, el.bgSum);
    updateSumBadge(el.carbs, el.carbsSum, 'g');

    // Calculate for each ratio
    const results = ratios.map(ratio => {
        const carbBolus = ratio > 0 ? carbs / ratio : 0;
        const correction = bg > target ? (bg - target) / isf : 0;
        const total = Math.max(0, carbBolus + correction - iob);
        const rounded = Math.round(total * 2) / 2;
        return { ratio, carbBolus, correction, total, rounded };
    });

    renderRatioResults(results);
    renderHistory();
}

function updateSumBadge(input, badge, suffix) {
    const val = input.value;
    const hasExpression = /[+\-*/]/.test(val) && val.length > 1;
    const resolved = solve(val);

    if (hasExpression && resolved > 0) {
        badge.textContent = `= ${resolved % 1 === 0 ? resolved : resolved.toFixed(1)}${suffix || ''}`;
        badge.classList.add('visible');
    } else {
        badge.classList.remove('visible');
    }
}

// --- Ratio Results Rendering ---
function renderRatioResults(results) {
    el.ratioResults.innerHTML = results.map((r, i) => `
        <div class="ratio-row${i === selectedRatioIndex ? ' selected' : ''}" data-index="${i}">
            <input class="ratio-number" type="number" inputmode="decimal" step="1"
                   value="${r.ratio}" data-ratio-index="${i}">
            <span class="ratio-val">${r.carbBolus.toFixed(1)}</span>
            <span class="ratio-val">${r.correction.toFixed(1)}</span>
            <span class="ratio-total">${r.rounded.toFixed(1)} u</span>
            <button class="ratio-remove" data-remove-index="${i}" title="Remove">&times;</button>
        </div>
    `).join('');
}

// --- History ---
function renderHistory() {
    el.historyList.innerHTML = bolusHistory.slice(-3).reverse().map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="history-item"><span>${time}</span><strong>${entry.amount.toFixed(1)} u</strong></div>`;
    }).join('');
}

// --- Event Handlers ---

// IOB mode toggle
document.querySelectorAll('input[name="iobMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        iobMode = e.target.value;
        localStorage.setItem('iobMode', iobMode);
        el.iobAutoPanel.style.display = iobMode === 'auto' ? '' : 'none';
        el.iobManualPanel.style.display = iobMode === 'manual' ? '' : 'none';
        calculate();
    });
});

// Ratio results: selection, inline edit, remove
el.ratioResults.addEventListener('click', (e) => {
    // Remove button
    const removeBtn = e.target.closest('[data-remove-index]');
    if (removeBtn) {
        const idx = parseInt(removeBtn.dataset.removeIndex);
        if (ratios.length > 1) {
            ratios.splice(idx, 1);
            if (selectedRatioIndex >= ratios.length) selectedRatioIndex = ratios.length - 1;
            saveRatios();
            calculate();
        }
        return;
    }

    // Row selection (but not when clicking the ratio input)
    const row = e.target.closest('.ratio-row');
    if (row && !e.target.classList.contains('ratio-number')) {
        selectedRatioIndex = parseInt(row.dataset.index);
        localStorage.setItem('selectedRatioIndex', selectedRatioIndex);
        calculate();
    }
});

// Inline ratio editing
el.ratioResults.addEventListener('input', (e) => {
    if (e.target.classList.contains('ratio-number')) {
        const idx = parseInt(e.target.dataset.ratioIndex);
        const val = parseFloat(e.target.value);
        if (val > 0 && !isNaN(val)) {
            ratios[idx] = val;
            saveRatios();
            calculate();
        }
    }
});

// Add ratio
el.addRatioBtn.addEventListener('click', () => {
    if (ratios.length < 6) {
        ratios.push(ratios[ratios.length - 1] + 2 || 10);
        saveRatios();
        calculate();
    }
});

// Log bolus
el.addBolusBtn.addEventListener('click', () => {
    const results = ratios.map(ratio => {
        const bg = solve(el.currentBg.value);
        const carbs = solve(el.carbs.value);
        const target = settings.targetBg;
        const isf = settings.isf || 1;
        const iob = iobMode === 'manual' ? calculateManualIOB() : calculateHistoryIOB();
        const carbBolus = ratio > 0 ? carbs / ratio : 0;
        const correction = bg > target ? (bg - target) / isf : 0;
        const total = Math.max(0, carbBolus + correction - iob);
        return Math.round(total * 2) / 2;
    });

    const amount = results[selectedRatioIndex] || 0;
    if (amount > 0) {
        bolusHistory.push({ timestamp: Date.now(), amount });
        localStorage.setItem('bolusHistory', JSON.stringify(bolusHistory));
        calculate();
    }
});

// Plus button: append "+" to carbs input (no stacking)
document.getElementById('carbsPlusBtn').addEventListener('click', () => {
    const input = el.carbs;
    const val = input.value;
    if (val.length > 0 && !val.endsWith('+')) {
        input.value = val + '+';
        input.focus();
    }
});

// Filter inputs: strip invalid characters as user types
el.carbs.addEventListener('input', () => {
    const cleaned = el.carbs.value.replace(/[^\d.+]/g, '');
    if (cleaned !== el.carbs.value) el.carbs.value = cleaned;
});

el.currentBg.addEventListener('input', () => {
    const cleaned = el.currentBg.value.replace(/[^\d.]/g, '');
    if (cleaned !== el.currentBg.value) el.currentBg.value = cleaned;
});

// Enter key to finalize math expressions
[el.currentBg, el.carbs].forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = solve(input.value);
            input.value = val > 0 ? val.toFixed(1) : '';
            input.blur();
            calculate();
        }
    });
});

// Real-time calculation on any input
document.body.addEventListener('input', (e) => {
    // Manual IOB fields
    if (e.target.id === 'manualUnits') localStorage.setItem('manualUnits', e.target.value);
    if (e.target.id === 'manualHoursAgo') localStorage.setItem('manualHoursAgo', e.target.value);

    calculate();
});

// Refresh IOB every minute
setInterval(calculate, 60000);

// Clear all
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear everything?')) {
        localStorage.clear();
        location.reload();
    }
});

// --- Helpers ---
function saveRatios() {
    localStorage.setItem('ratios', JSON.stringify(ratios));
    localStorage.setItem('selectedRatioIndex', selectedRatioIndex);
}

function saveSettings() {
    localStorage.setItem('units', settings.units);
    localStorage.setItem('targetBg', settings.targetBg);
    localStorage.setItem('isf', settings.isf);
    localStorage.setItem('dia', settings.dia);
    localStorage.setItem('insulinType', settings.insulinType);
    localStorage.setItem('setupComplete', settings.setupComplete);
}

function updateSettingsSummary() {
    const unitStr = settings.units === 'mmol' ? 'mmol/L' : 'mg/dL';
    el.summaryTarget.textContent = settings.targetBg;
    el.summaryIsf.textContent = settings.isf;
    el.summaryDia.textContent = settings.dia + 'h';
    el.summaryUnits.textContent = unitStr;
}

function updateUnitLabels() {
    const unitStr = settings.units === 'mmol' ? 'mmol/L' : 'mg/dL';
    document.querySelectorAll('.unit-label').forEach(el => el.textContent = unitStr);
    document.querySelectorAll('.unit-label-per').forEach(el => el.textContent = unitStr + '/unit');
}

// --- Settings Screen ---
function openSettings() {
    const overlay = document.getElementById('settingsOverlay');
    // Populate form with current values
    document.getElementById('sTargetBg').value = settings.targetBg;
    document.getElementById('sIsf').value = settings.isf;
    document.getElementById('sDia').value = settings.dia;
    document.getElementById('sInsulinType').value = settings.insulinType;

    // Set active unit button
    document.querySelectorAll('#settingsUnitToggle .unit-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === settings.units);
    });

    renderSettingsRatios();
    updateUnitLabels();
    overlay.classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settingsOverlay').classList.add('hidden');
}

function renderSettingsRatios() {
    const container = document.getElementById('sRatioList');
    container.innerHTML = ratios.map((r, i) => `
        <div class="settings-ratio-row">
            <input type="number" inputmode="decimal" step="1" min="1" max="50"
                   value="${r}" data-ratio-idx="${i}" class="s-ratio-input">
            <span class="ratio-suffix">g/unit</span>
            <button class="ratio-remove" data-s-remove="${i}" title="Remove">&times;</button>
        </div>
    `).join('');
}

// Settings event listeners
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsBack').addEventListener('click', closeSettings);
el.settingsSummary.addEventListener('click', openSettings);

document.getElementById('settingsSaveBtn').addEventListener('click', () => {
    // Read values from form
    const activeUnit = document.querySelector('#settingsUnitToggle .unit-btn.active');
    settings.units = activeUnit ? activeUnit.dataset.unit : 'mmol';
    settings.targetBg = parseFloat(document.getElementById('sTargetBg').value) || 5.5;
    settings.isf = parseFloat(document.getElementById('sIsf').value) || 2.0;
    settings.dia = parseFloat(document.getElementById('sDia').value) || 4;
    settings.insulinType = document.getElementById('sInsulinType').value;

    // Validate
    if (settings.targetBg <= 0 || settings.isf <= 0 || settings.dia < 2 || settings.dia > 8) {
        alert('Please check your values. Target and ISF must be positive. DIA must be 2-8 hours.');
        return;
    }

    // Read ratios from form
    const ratioInputs = document.querySelectorAll('.s-ratio-input');
    const newRatios = [];
    ratioInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (val > 0) newRatios.push(val);
    });
    if (newRatios.length > 0) {
        ratios.length = 0;
        newRatios.forEach(r => ratios.push(r));
        if (selectedRatioIndex >= ratios.length) selectedRatioIndex = 0;
        saveRatios();
    }

    saveSettings();
    updateSettingsSummary();
    calculate();
    closeSettings();
});

// Unit toggle in settings
document.getElementById('settingsUnitToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.unit-btn');
    if (!btn) return;
    document.querySelectorAll('#settingsUnitToggle .unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Convert existing values when switching units
    const oldUnit = settings.units;
    const newUnit = btn.dataset.unit;
    if (oldUnit !== newUnit) {
        const targetInput = document.getElementById('sTargetBg');
        const isfInput = document.getElementById('sIsf');
        if (newUnit === 'mgdl') {
            targetInput.value = Math.round(parseFloat(targetInput.value) * 18) || '';
            isfInput.value = Math.round(parseFloat(isfInput.value) * 18) || '';
        } else {
            targetInput.value = (parseFloat(targetInput.value) / 18).toFixed(1) || '';
            isfInput.value = (parseFloat(isfInput.value) / 18).toFixed(1) || '';
        }
        // Temporarily update settings.units so labels update correctly
        settings.units = newUnit;
        updateUnitLabels();
    }
});

// Ratio add/remove in settings
document.getElementById('sAddRatio').addEventListener('click', () => {
    if (ratios.length < 6) {
        ratios.push(ratios[ratios.length - 1] + 2 || 10);
        renderSettingsRatios();
    }
});

document.getElementById('sRatioList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-s-remove]');
    if (btn && ratios.length > 1) {
        const idx = parseInt(btn.dataset.sRemove);
        ratios.splice(idx, 1);
        if (selectedRatioIndex >= ratios.length) selectedRatioIndex = ratios.length - 1;
        renderSettingsRatios();
    }
});

// Reset all settings
document.getElementById('settingsResetBtn').addEventListener('click', () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
    }
});

// --- First Launch Wizard ---
let wizardStep = 1;
const WIZARD_STEPS = 7;
let wizardUnit = 'mmol';
let wizardRatios = [10];
let wizardDiaMode = 'preset';
let wizardDiaValue = 4;

function openWizard() {
    wizardStep = 1;
    wizardUnit = settings.units || 'mmol';
    wizardRatios = ratios.length ? [...ratios] : [10];
    wizardDiaMode = [3, 4, 5].includes(settings.dia) ? 'preset' : 'custom';
    wizardDiaValue = settings.dia || 4;

    // Set unit toggle to current
    document.querySelectorAll('#wizardUnitToggle .unit-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === wizardUnit);
    });

    // Pre-fill inputs when re-entering
    if (settings.setupComplete) {
        document.getElementById('wTargetBg').value = settings.targetBg;
        document.getElementById('wIsf').value = settings.isf;
        document.getElementById('wInsulinType').value = settings.insulinType;
    } else {
        document.getElementById('wTargetBg').value = '';
        document.getElementById('wIsf').value = '';
        document.getElementById('wInsulinType').value = '';
    }

    // Set DIA presets
    document.querySelectorAll('.dia-preset-btn').forEach(btn => {
        if (wizardDiaMode === 'preset') {
            btn.classList.toggle('active', parseFloat(btn.dataset.dia) === wizardDiaValue);
        } else {
            btn.classList.toggle('active', btn.dataset.dia === 'custom');
        }
    });
    if (wizardDiaMode === 'custom') {
        document.getElementById('diaCustomField').style.display = '';
        document.getElementById('wDia').value = wizardDiaValue;
    } else {
        document.getElementById('diaCustomField').style.display = 'none';
    }

    renderWizardStep();
    renderWizardRatios();
    document.getElementById('wizardOverlay').classList.remove('hidden');
}

function closeWizard() {
    document.getElementById('wizardOverlay').classList.add('hidden');
}

function renderWizardStep() {
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === wizardStep);
    });

    // Progress indicator
    document.getElementById('wizardProgressBar').style.width = (wizardStep / WIZARD_STEPS * 100) + '%';
    document.getElementById('wizardStepCounter').textContent = `Step ${wizardStep} of ${WIZARD_STEPS}`;

    // Navigation visibility
    document.getElementById('wizardBackBtn').style.visibility = wizardStep === 1 ? 'hidden' : 'visible';
    const skipBtn = document.getElementById('wizardSkipBtn');
    if (wizardStep === WIZARD_STEPS) {
        // Done screen
        document.getElementById('wizardNextBtn').textContent = 'Start Calculating';
        skipBtn.style.display = 'none';
        document.getElementById('wizardBackBtn').style.visibility = 'hidden';
    } else {
        document.getElementById('wizardNextBtn').textContent = 'Next';
        skipBtn.style.display = '';
    }

    // Update unit labels in wizard
    const unitStr = wizardUnit === 'mmol' ? 'mmol/L' : 'mg/dL';
    document.querySelectorAll('#wizardOverlay .unit-label').forEach(el => el.textContent = unitStr);
    document.querySelectorAll('#wizardOverlay .unit-label-per').forEach(el => el.textContent = unitStr + '/unit');

    // Set placeholders based on units
    const tInput = document.getElementById('wTargetBg');
    const iInput = document.getElementById('wIsf');
    if (wizardUnit === 'mgdl') {
        if (tInput && !tInput.value) tInput.placeholder = '100';
        if (iInput && !iInput.value) iInput.placeholder = '45';
    } else {
        if (tInput && !tInput.value) tInput.placeholder = '5.5';
        if (iInput && !iInput.value) iInput.placeholder = '2.5';
    }
}

function renderWizardRatios() {
    const container = document.getElementById('wRatioList');
    container.innerHTML = wizardRatios.map((r, i) => `
        <div class="settings-ratio-row">
            <input type="number" inputmode="decimal" step="1" min="1" max="50"
                   value="${r}" data-w-ratio-idx="${i}" class="w-ratio-input">
            <span class="ratio-suffix">g/unit</span>
            ${wizardRatios.length > 1 ? `<button class="ratio-remove" data-w-remove="${i}" title="Remove">&times;</button>` : ''}
        </div>
    `).join('');
}

function saveWizardValues() {
    settings.units = wizardUnit;
    settings.isf = parseFloat(document.getElementById('wIsf').value) || (wizardUnit === 'mgdl' ? 45 : 2.5);
    settings.targetBg = parseFloat(document.getElementById('wTargetBg').value) || (wizardUnit === 'mgdl' ? 100 : 5.5);
    settings.dia = wizardDiaMode === 'custom' ? (parseFloat(document.getElementById('wDia').value) || 4) : wizardDiaValue;
    settings.insulinType = document.getElementById('wInsulinType').value;
    settings.setupComplete = true;

    // Save ratios
    ratios.length = 0;
    wizardRatios.forEach(r => ratios.push(r));
    selectedRatioIndex = 0;
    saveRatios();

    localStorage.removeItem('wizardSkipped');
    saveSettings();
    updateSettingsSummary();
    calculate();
    hideSetupBanner();
}

// Wizard navigation
document.getElementById('wizardNextBtn').addEventListener('click', () => {
    // Validate current step
    if (wizardStep === 3) {
        // Read ratios from wizard inputs
        const inputs = document.querySelectorAll('.w-ratio-input');
        wizardRatios = [];
        inputs.forEach(input => {
            const val = parseFloat(input.value);
            if (val > 0) wizardRatios.push(val);
        });
        if (wizardRatios.length === 0) wizardRatios = [10];
    }

    if (wizardStep === 4) {
        const i = parseFloat(document.getElementById('wIsf').value);
        if (!i || i <= 0) {
            document.getElementById('wIsf').focus();
            return;
        }
    }

    if (wizardStep === 5) {
        const t = parseFloat(document.getElementById('wTargetBg').value);
        if (!t || t <= 0) {
            document.getElementById('wTargetBg').focus();
            return;
        }
    }

    if (wizardStep === 6) {
        // Save all values on transition to Done screen
        saveWizardValues();
    }

    if (wizardStep < WIZARD_STEPS) {
        wizardStep++;
        renderWizardStep();
    } else {
        // Step 7 (Done) — just close
        closeWizard();
    }
});

document.getElementById('wizardBackBtn').addEventListener('click', () => {
    if (wizardStep > 1) {
        wizardStep--;
        renderWizardStep();
    }
});

// Skip wizard
document.getElementById('wizardSkipBtn').addEventListener('click', () => {
    localStorage.setItem('wizardSkipped', 'true');
    saveSettings();
    updateSettingsSummary();
    calculate();
    closeWizard();
    showSetupBanner();
});

// Wizard unit toggle
document.getElementById('wizardUnitToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.unit-btn');
    if (!btn) return;
    document.querySelectorAll('#wizardUnitToggle .unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    wizardUnit = btn.dataset.unit;
    renderWizardStep();
});

// DIA preset buttons
document.getElementById('diaPresets').addEventListener('click', (e) => {
    const btn = e.target.closest('.dia-preset-btn');
    if (!btn) return;
    document.querySelectorAll('.dia-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.dia === 'custom') {
        wizardDiaMode = 'custom';
        document.getElementById('diaCustomField').style.display = '';
        document.getElementById('wDia').focus();
    } else {
        wizardDiaMode = 'preset';
        wizardDiaValue = parseFloat(btn.dataset.dia);
        document.getElementById('diaCustomField').style.display = 'none';
    }
});

// Wizard ratio add/remove
document.getElementById('wAddRatio').addEventListener('click', () => {
    if (wizardRatios.length < 6) {
        wizardRatios.push(wizardRatios[wizardRatios.length - 1] + 2 || 10);
        renderWizardRatios();
    }
});

document.getElementById('wRatioList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-w-remove]');
    if (btn && wizardRatios.length > 1) {
        const idx = parseInt(btn.dataset.wRemove);
        wizardRatios.splice(idx, 1);
        renderWizardRatios();
    }
});

// --- Setup Banner ---
function showSetupBanner() {
    document.getElementById('setupBanner').classList.remove('hidden');
}

function hideSetupBanner() {
    document.getElementById('setupBanner').classList.add('hidden');
}

document.getElementById('setupBanner').addEventListener('click', (e) => {
    if (!e.target.closest('.setup-banner-dismiss')) {
        openWizard();
        hideSetupBanner();
    }
});

document.getElementById('setupBannerDismiss').addEventListener('click', (e) => {
    e.stopPropagation();
    hideSetupBanner();
    localStorage.removeItem('wizardSkipped');
});

// Re-enter wizard from settings
document.getElementById('settingsRunWizardBtn').addEventListener('click', () => {
    closeSettings();
    openWizard();
});

// --- Disclaimer ---
document.getElementById('disclaimerAcceptBtn').addEventListener('click', () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    document.getElementById('disclaimerModal').classList.add('hidden');
    // Now proceed to wizard
    openWizard();
});

// Full disclaimer overlay (accessible from footer link)
document.getElementById('disclaimerLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('disclaimerOverlay').classList.remove('hidden');
});

document.getElementById('disclaimerBack').addEventListener('click', () => {
    document.getElementById('disclaimerOverlay').classList.add('hidden');
});

// --- PWA Install Prompt ---
let deferredInstallPrompt = null;

// Capture Android's beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
});

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function shouldShowInstallBanner() {
    if (isStandalone()) return false;
    if (localStorage.getItem('pwaInstalled') === 'true') return false;
    const dismissed = localStorage.getItem('installDismissed');
    if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedAt < sevenDays) return false;
    }
    return true;
}

function showInstallBanner() {
    if (!shouldShowInstallBanner()) return;

    const banner = document.getElementById('installBanner');
    const hint = document.getElementById('installHint');
    const installBtn = document.getElementById('installBtn');

    if (isIos()) {
        hint.textContent = 'Tap the Share button, then "Add to Home Screen"';
        installBtn.style.display = 'none';
    } else if (deferredInstallPrompt) {
        hint.textContent = '';
    } else {
        // Desktop or unsupported browser — still show but with hint
        hint.textContent = 'Use your browser menu to install this app';
        installBtn.style.display = 'none';
    }

    banner.classList.remove('hidden');
}

document.getElementById('installBtn').addEventListener('click', () => {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(result => {
            if (result.outcome === 'accepted') {
                localStorage.setItem('pwaInstalled', 'true');
            }
            deferredInstallPrompt = null;
            document.getElementById('installBanner').classList.add('hidden');
        });
    }
});

document.getElementById('installDismiss').addEventListener('click', () => {
    document.getElementById('installBanner').classList.add('hidden');
    localStorage.setItem('installDismissed', Date.now().toString());
});

// Detect install after the fact
window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwaInstalled', 'true');
    document.getElementById('installBanner').classList.add('hidden');
});

// --- Init ---
window.addEventListener('load', () => {
    el.manualUnits.value = localStorage.getItem('manualUnits') || '';
    el.manualHoursAgo.value = localStorage.getItem('manualHoursAgo') || '';

    // Restore IOB mode
    if (iobMode === 'manual') {
        document.getElementById('iobManual').checked = true;
        el.iobAutoPanel.style.display = 'none';
        el.iobManualPanel.style.display = '';
    }

    updateSettingsSummary();
    calculate();

    // First launch: show disclaimer before wizard
    if (!settings.setupComplete) {
        if (localStorage.getItem('wizardSkipped') === 'true') {
            showSetupBanner();
        } else if (localStorage.getItem('disclaimerAccepted') !== 'true') {
            document.getElementById('disclaimerModal').classList.remove('hidden');
        } else {
            openWizard();
        }
    }

    // PWA install prompt: show after 10s or first interaction
    if (shouldShowInstallBanner()) {
        let installShown = false;
        const triggerInstall = () => {
            if (installShown) return;
            installShown = true;
            clearTimeout(installTimer);
            showInstallBanner();
        };
        const installTimer = setTimeout(triggerInstall, 10000);
        document.addEventListener('click', triggerInstall, { once: true });
        document.addEventListener('input', triggerInstall, { once: true });
    }
});
