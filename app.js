const elements = {
    currentBg: document.getElementById('currentBg'),
    carbs: document.getElementById('carbs'),
    targetBg: document.getElementById('targetBg'),
    isf: document.getElementById('isf'),
    carbRatio: document.getElementById('carbRatio'),
    resultsSection: document.getElementById('resultsSection'),
    dia: document.getElementById('dia'),
    iobValue: document.getElementById('iobValue'),
    historyList: document.getElementById('historyList'),
    addBolusBtn: document.getElementById('addBolusBtn')
};

const outputs = {
    carb: document.getElementById('outCarb'),
    corr: document.getElementById('outCorr'),
    total: document.getElementById('outTotal'),
    rounded: document.getElementById('outRounded')
};

// YNAB-style Math Evaluator
function solve(str) {
    if (!str || typeof str !== 'string') return 0;
    try {
        // Sanitize: allow numbers and + - * / . ( )
        const clean = str.replace(/[^-()\d/*+.]/g, '');
        if (!clean) return 0;
        // Evaluate the string
        const result = Function(`'use strict'; return (${clean})`)();
        return isFinite(result) ? result : 0;
    } catch (e) {
        return 0; // Return 0 while the user is still typing (e.g., "10+")
    }
}

let bolusHistory = JSON.parse(localStorage.getItem('bolusHistory')) || [];

function calculateIOB() {
    const diaHours = parseFloat(elements.dia.value) || 4;
    const now = Date.now();
    let totalIOB = 0;

    bolusHistory = bolusHistory.filter(entry => {
        const ageHours = (now - entry.timestamp) / 1000 / 60 / 60;
        if (ageHours < diaHours) {
            // Linear Decay: (Dose / DIA) * (DIA - Age)
            const remaining = (entry.amount / diaHours) * (diaHours - ageHours);
            totalIOB += remaining;
            return true; // Keep in history
        }
        return false; // Remove expired insulin
    });

    elements.iobValue.textContent = totalIOB.toFixed(2) + " u";
    return totalIOB;
}

function calculate() {
    const bg = solve(elements.currentBg.value);
    const carbs = solve(elements.carbs.value);
    const target = parseFloat(elements.targetBg.value) || 0;
    const isf = parseFloat(elements.isf.value) || 1;
    const ratio = parseFloat(elements.carbRatio.value) || 1;
    const iob = calculateIOB();

    const carbBolus = carbs / ratio;
    const correctionBolus = bg > target ? (bg - target) / isf : 0;
    
    // Safety Logic: Subtract IOB from total dose
    const totalBolus = Math.max(0, (carbBolus + correctionBolus) - iob);

    outputs.carb.textContent = carbBolus.toFixed(2);
    outputs.corr.textContent = correctionBolus.toFixed(2);
    outputs.total.textContent = totalBolus.toFixed(2);
    outputs.rounded.textContent = (Math.round(totalBolus * 2) / 2).toFixed(1);
    
    renderHistory();
}

function renderHistory() {
    elements.historyList.innerHTML = bolusHistory.slice(-3).reverse().map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `<div class="history-item"><span>${time}</span> <strong>${entry.amount.toFixed(1)} u</strong></div>`;
    }).join('');
}

elements.addBolusBtn.addEventListener('click', () => {
    const amount = parseFloat(outputs.rounded.textContent);
    if (amount > 0) {
        bolusHistory.push({ timestamp: Date.now(), amount: amount });
        localStorage.setItem('bolusHistory', JSON.stringify(bolusHistory));
        calculate();
    }
});

// Plus button: append "+" to carbs input (no stacking)
document.getElementById('carbsPlusBtn').addEventListener('click', () => {
    const input = elements.carbs;
    const val = input.value;
    if (val.length > 0 && !val.endsWith('+')) {
        input.value = val + '+';
        input.focus();
    }
});

// Update calculate interval to refresh IOB every minute
setInterval(calculate, 60000);

// Handle "Enter" key to finalize math (YNAB behavior)
[elements.currentBg, elements.carbs].forEach(el => {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const finalValue = solve(el.value);
            el.value = finalValue > 0 ? finalValue.toFixed(1) : '';
            el.blur(); // Hide keyboard
            calculate();
        }
    });
});

// Real-time calculation as you type
document.body.addEventListener('input', (e) => {
    if (['targetBg', 'isf', 'carbRatio'].includes(e.target.id)) {
        localStorage.setItem(e.target.id, e.target.value);
    }
    calculate();
});

window.addEventListener('load', () => {
    elements.targetBg.value = localStorage.getItem('targetBg') || 5.5;
    elements.isf.value = localStorage.getItem('isf') || 2.0;
    elements.carbRatio.value = localStorage.getItem('carbRatio') || 10;
    calculate();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear everything?')) {
        localStorage.clear();
        location.reload();
    }
});
