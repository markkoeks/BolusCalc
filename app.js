// --- State ---
let ratios = JSON.parse(localStorage.getItem('ratios')) || null;
let selectedRatioIndex = parseInt(localStorage.getItem('selectedRatioIndex')) || 0;
let bolusHistory = JSON.parse(localStorage.getItem('bolusHistory')) || [];
let iobMode = localStorage.getItem('iobMode') || 'auto';

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
    targetBg: document.getElementById('targetBg'),
    isf: document.getElementById('isf'),
    dia: document.getElementById('dia'),
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
    const diaHours = parseFloat(el.dia.value) || 4;
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
    const diaHours = parseFloat(el.dia.value) || 4;

    if (units <= 0 || hoursAgo >= diaHours) return 0;
    return (units / diaHours) * (diaHours - hoursAgo);
}

// --- Main Calculation ---
function calculate() {
    const bg = solve(el.currentBg.value);
    const carbs = solve(el.carbs.value);
    const target = parseFloat(el.targetBg.value) || 0;
    const isf = parseFloat(el.isf.value) || 1;

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
        const target = parseFloat(el.targetBg.value) || 0;
        const isf = parseFloat(el.isf.value) || 1;
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
    const settingsIds = ['targetBg', 'isf', 'dia'];
    if (settingsIds.includes(e.target.id)) {
        localStorage.setItem(e.target.id, e.target.value);
    }
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

// --- Init ---
window.addEventListener('load', () => {
    el.targetBg.value = localStorage.getItem('targetBg') || 5.5;
    el.isf.value = localStorage.getItem('isf') || 2.0;
    el.dia.value = localStorage.getItem('dia') || 4;
    el.manualUnits.value = localStorage.getItem('manualUnits') || '';
    el.manualHoursAgo.value = localStorage.getItem('manualHoursAgo') || '';

    // Restore IOB mode
    if (iobMode === 'manual') {
        document.getElementById('iobManual').checked = true;
        el.iobAutoPanel.style.display = 'none';
        el.iobManualPanel.style.display = '';
    }

    calculate();
});
