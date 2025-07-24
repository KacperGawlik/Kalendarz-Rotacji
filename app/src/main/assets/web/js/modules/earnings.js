import { StorageManager } from '../utils/storage.js';

export class EarningsManager {
    constructor() {
        this.earnings = [];
    }

    loadEarnings() {
        this.earnings = StorageManager.loadEarnings();
        this.updateTotalEarnings();
        this.displayEarnings();
    }

    toggleEarningsForm() {
        const form = document.getElementById('earningsForm');
        form.classList.toggle('active');

        if (form.classList.contains('active')) {
            document.getElementById('earningAmount').value = '';
            document.getElementById('earningDate').valueAsDate = new Date();
            document.getElementById('earningNote').value = '';
        }
    }

    saveEarning() {
        const amount = parseFloat(document.getElementById('earningAmount').value);
        const date = document.getElementById('earningDate').value;
        const note = document.getElementById('earningNote').value;

        if (!amount || amount <= 0) {
            alert('Proszę wprowadź prawidłową kwotę');
            return;
        }

        const earning = {
            id: Date.now(),
            amount: amount,
            date: date,
            note: note
        };

        this.earnings.push(earning);
        StorageManager.saveEarnings(this.earnings);
        this.updateTotalEarnings();
        this.displayEarnings();
        this.toggleEarningsForm();
    }

    displayEarnings() {
        const earningsHistory = document.getElementById('earningsHistory');
        if (!earningsHistory) {
            console.error('earningsHistory element not found!');
            return;
        }

        earningsHistory.innerHTML = '';

        const sortedEarnings = [...this.earnings].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedEarnings.forEach((earning) => {
            const earningItem = document.createElement('div');
            earningItem.className = 'earning-item';

            earningItem.innerHTML = `
                <div class="earning-info">
                    <div class="earning-amount">${earning.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NOK</div>
                    <div class="earning-date">${new Date(earning.date).toLocaleDateString('pl-PL')}</div>
                    ${earning.note ? `<div class="earning-note">${earning.note}</div>` : ''}
                </div>
                <button class="delete-earning-btn" onclick="deleteEarning(${earning.id})">×</button>
            `;

            earningsHistory.appendChild(earningItem);
        });
    }

    deleteEarning(id) {
        for (let i = 0; i < this.earnings.length; i++) {
            if (this.earnings[i].id == id) {
                this.earnings.splice(i, 1);
                StorageManager.saveEarnings(this.earnings);
                this.updateTotalEarnings();
                this.displayEarnings();
                alert('✅ Wpis został usunięty!');
                return;
            }
        }
        alert('❌ Nie znaleziono wpisu do usunięcia');
    }

    updateTotalEarnings() {
        const total = this.earnings.reduce((sum, earning) => sum + earning.amount, 0);
        const totalElement = document.getElementById('totalEarnings');
        if (totalElement) {
            totalElement.textContent = total.toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + ' NOK';
        }
    }
}

// Make functions globally available for onclick handlers
window.toggleEarningsForm = function() {
    if (window.earningsManager) {
        window.earningsManager.toggleEarningsForm();
    }
};

window.saveEarning = function() {
    if (window.earningsManager) {
        window.earningsManager.saveEarning();
    }
};

window.deleteEarning = function(id) {
    if (window.earningsManager) {
        window.earningsManager.deleteEarning(id);
    }
};