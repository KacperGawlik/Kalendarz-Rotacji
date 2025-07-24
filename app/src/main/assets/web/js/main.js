// Konfiguracja i stałe
const CONFIG = {
    APP_NAME: 'Kalendarz Rotacji',
    VERSION: '1.0.0',
    STORAGE_KEYS: {
        ROTATION_DATA: 'rotationData',
        EARNINGS: 'earnings',
        FLIGHTS: 'flights'
    }
};

const MONTH_NAMES = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

// Globalne zmienne
let rotationData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let earnings = [];
let flights = [];

// Storage Manager
class StorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.log(`LocalStorage not available for ${key}, using memory storage`);
            window[`saved${key}`] = data;
            return false;
        }
    }

    static load(key) {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.log(`Error loading from localStorage: ${error}`);
        }
        return window[`saved${key}`] || null;
    }

    static saveRotationData(lastDeparture, rotations) {
        const dataToSave = {
            lastDeparture: lastDeparture.toISOString(),
            savedAt: new Date().toISOString()
        };

        this.save(CONFIG.STORAGE_KEYS.ROTATION_DATA, dataToSave);

        if (typeof AndroidWidget !== 'undefined') {
            const widgetData = {
                lastDeparture: lastDeparture.toISOString(),
                rotations: rotations.map(r => ({
                    start: r.start.toISOString(),
                    end: r.end.toISOString(),
                    type: r.type
                }))
            };
            AndroidWidget.updateWidgetData(JSON.stringify(widgetData));
        }
    }

    static loadRotationData() {
        return this.load(CONFIG.STORAGE_KEYS.ROTATION_DATA);
    }

    static saveEarnings(earningsData) {
        this.save(CONFIG.STORAGE_KEYS.EARNINGS, earningsData);
    }

    static loadEarnings() {
        return this.load(CONFIG.STORAGE_KEYS.EARNINGS) || [];
    }

    static saveFlights(flightsData) {
        this.save(CONFIG.STORAGE_KEYS.FLIGHTS, flightsData);
    }

    static loadFlights() {
        return this.load(CONFIG.STORAGE_KEYS.FLIGHTS) || [];
    }
}

// Menu functions
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
}

function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(pageName + 'Page').classList.add('active');

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.menu-item').classList.add('active');

    toggleMenu();

    if (pageName === 'statistics') {
        updateStatistics();
        displayEarnings();
    }
}

function calculateRotationsFromDate(lastDeparture) {
    rotationData = [];
    let currentWorkStart = new Date(lastDeparture);
    currentWorkStart.setHours(0, 0, 0, 0);

    console.log("🚀 Rozpoczynam obliczenia rotacji od:", currentWorkStart.toLocaleDateString());

    // Generuj rotacje na cały rok (około 10-11 pełnych cykli)
    for (let i = 0; i < 12; i++) {
        // PRACA W NORWEGII - 15 dni
        // Od daty wylotu przez 15 dni (włącznie z dniem wylotu)
        const workStart = new Date(currentWorkStart);
        const workEnd = new Date(currentWorkStart);
        workEnd.setDate(workEnd.getDate() + 14); // +14 = 15 dni łącznie

        rotationData.push({
            start: new Date(workStart),
            end: new Date(workEnd),
            type: 'work'
        });

        console.log(`✈️ Rotacja ${i + 1} - Praca: ${workStart.toLocaleDateString()} - ${workEnd.toLocaleDateString()}`);

        // ODPOCZYNEK W POLSCE - 20 dni
        // Od dnia po ostatnim dniu pracy przez 20 dni
        const restStart = new Date(workEnd);
        restStart.setDate(restStart.getDate() + 1);

        const restEnd = new Date(restStart);
        restEnd.setDate(restEnd.getDate() + 19); // +19 = 20 dni łącznie

        rotationData.push({
            start: new Date(restStart),
            end: new Date(restEnd),
            type: 'rest'
        });

        console.log(`🏠 Rotacja ${i + 1} - Odpoczynek: ${restStart.toLocaleDateString()} - ${restEnd.toLocaleDateString()}`);

        // NASTĘPNY WYLOT - dzień po zakończeniu odpoczynku
        currentWorkStart = new Date(restEnd);
        currentWorkStart.setDate(currentWorkStart.getDate() + 1);
    }

    // Weryfikacja pierwszych rotacji
    console.log("🔍 Weryfikacja pierwszych rotacji:");
    if (rotationData.length >= 4) {
        console.log("1️⃣ Praca:", rotationData[0].start.toLocaleDateString(), "-", rotationData[0].end.toLocaleDateString(), "(15 dni)");
        console.log("2️⃣ Odpoczynek:", rotationData[1].start.toLocaleDateString(), "-", rotationData[1].end.toLocaleDateString(), "(20 dni)");
        console.log("3️⃣ Praca:", rotationData[2].start.toLocaleDateString(), "-", rotationData[2].end.toLocaleDateString(), "(15 dni)");
        console.log("4️⃣ Odpoczynek:", rotationData[3].start.toLocaleDateString(), "-", rotationData[3].end.toLocaleDateString(), "(20 dni)");
    }

    console.log(`✅ Wygenerowano łącznie ${rotationData.length} rotacji`);
}
function updateStatusCards() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentRotation = rotationData.find(rotation =>
        today >= rotation.start && today <= rotation.end
    );

    if (currentRotation) {
        const daysLeft = Math.ceil((currentRotation.end - today) / (1000 * 60 * 60 * 24)) + 1;

        if (currentRotation.type === 'work') {
            document.getElementById('currentDays').textContent = daysLeft;
            document.getElementById('currentLabel').textContent = 'Dni do powrotu';
            document.getElementById('currentStatus').className = 'status-card work';

            document.getElementById('nextDays').textContent = '--';
            document.getElementById('nextLabel').textContent = 'Dni do wylotu';
            document.getElementById('nextStatus').className = 'status-card rest';
        } else {
            document.getElementById('currentDays').textContent = '--';
            document.getElementById('currentLabel').textContent = 'Dni do powrotu';
            document.getElementById('currentStatus').className = 'status-card work';

            document.getElementById('nextDays').textContent = daysLeft;
            document.getElementById('nextLabel').textContent = 'Dni do wylotu';
            document.getElementById('nextStatus').className = 'status-card rest';
        }
    } else {
        document.getElementById('currentDays').textContent = '--';
        document.getElementById('currentLabel').textContent = 'Dni do powrotu';
        document.getElementById('currentStatus').className = 'status-card work';

        document.getElementById('nextDays').textContent = '--';
        document.getElementById('nextLabel').textContent = 'Dni do wylotu';
        document.getElementById('nextStatus').className = 'status-card rest';
    }
}

function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    document.getElementById('calendarTitle').textContent =
        `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    calendar.innerHTML = '';

    DAY_NAMES.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendar.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        const currentDate = new Date(currentYear, currentMonth, day);
        const today = new Date();

        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        const rotation = rotationData.find(rotation => {
            const checkDate = new Date(currentDate);
            checkDate.setHours(0, 0, 0, 0);
            const rotationStart = new Date(rotation.start);
            rotationStart.setHours(0, 0, 0, 0);
            const rotationEnd = new Date(rotation.end);
            rotationEnd.setHours(0, 0, 0, 0);
            return checkDate >= rotationStart && checkDate <= rotationEnd;
        });

        if (rotation) {
            dayElement.classList.add(rotation.type);
        }

        calendar.appendChild(dayElement);
    }
}

function generateUpcomingEvents() {
    const upcomingEvents = document.getElementById('upcomingEvents');
    const today = new Date();

    let events = [];
    rotationData.forEach(rotation => {
        if (rotation.start > today) {
            events.push({
                date: rotation.start,
                type: rotation.type,
                label: rotation.type === 'work' ? 'Wylot do Norwegii' : 'Powrót do Polski'
            });
        }
    });

    events = events.slice(0, 5);

    upcomingEvents.innerHTML = '';
    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = `upcoming-item ${event.type}`;

        eventElement.innerHTML = `
            <div class="upcoming-date">${event.date.toLocaleDateString('pl-PL')}</div>
            <div class="upcoming-type ${event.type}">${event.label}</div>
        `;

        upcomingEvents.appendChild(eventElement);
    });
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
}

function calculateRotations() {
    const lastDepartureInput = document.getElementById('lastDeparture');
    const lastDeparture = new Date(lastDepartureInput.value);

    if (!lastDeparture || isNaN(lastDeparture.getTime())) {
        alert('Proszę wprowadź datę ostatniego wylotu.');
        return;
    }

    StorageManager.saveRotationData(lastDeparture, rotationData);
    calculateRotationsFromDate(lastDeparture);

    document.getElementById('setupSection').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');

    updateStatusCards();
    generateCalendar();
    generateUpcomingEvents();
}

function showEditSection() {
    document.getElementById('setupSection').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');

    const savedData = StorageManager.loadRotationData();
    if (savedData) {
        const savedDate = new Date(savedData.lastDeparture);
        document.getElementById('lastDeparture').valueAsDate = savedDate;
    }
}

function loadSavedData() {
    const savedData = StorageManager.loadRotationData();
    if (savedData) {
        const lastDeparture = new Date(savedData.lastDeparture);
        calculateRotationsFromDate(lastDeparture);

        document.getElementById('setupSection').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');

        updateStatusCards();
        generateCalendar();
        generateUpcomingEvents();
        return true;
    } else {
        document.getElementById('setupSection').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        return false;
    }
}

function updateStatistics() {
    if (rotationData.length === 0) return;

    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);

    let workDays = 0;
    let restDays = 0;

    rotationData.forEach(rotation => {
        const start = rotation.start > yearStart ? rotation.start : yearStart;
        const end = rotation.end < yearEnd ? rotation.end : yearEnd;

        if (start <= end) {
            const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            if (rotation.type === 'work') {
                workDays += days;
            } else {
                restDays += days;
            }
        }
    });

    document.getElementById('workDays').textContent = workDays;
    document.getElementById('restDays').textContent = restDays;
    document.getElementById('workWeeks').textContent = Math.floor(workDays / 7);
    document.getElementById('restWeeks').textContent = Math.floor(restDays / 7);
}

// Earnings functions
function toggleEarningsForm() {
    const form = document.getElementById('earningsForm');
    form.classList.toggle('active');

    if (form.classList.contains('active')) {
        document.getElementById('earningAmount').value = '';
        document.getElementById('earningDate').valueAsDate = new Date();
        document.getElementById('earningNote').value = '';
    }
}

function saveEarning() {
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

    earnings.push(earning);
    StorageManager.saveEarnings(earnings);
    updateTotalEarnings();
    displayEarnings();
    toggleEarningsForm();
}

function loadEarnings() {
    earnings = StorageManager.loadEarnings();
    updateTotalEarnings();
    displayEarnings();
}

function displayEarnings() {
    const earningsHistory = document.getElementById('earningsHistory');
    if (!earningsHistory) {
        return;
    }

    earningsHistory.innerHTML = '';

    const sortedEarnings = [...earnings].sort((a, b) => new Date(b.date) - new Date(a.date));

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

function deleteEarning(id) {
    for (let i = 0; i < earnings.length; i++) {
        if (earnings[i].id == id) {
            earnings.splice(i, 1);
            StorageManager.saveEarnings(earnings);
            updateTotalEarnings();
            displayEarnings();
            alert('✅ Wpis został usunięty!');
            return;
        }
    }
    alert('❌ Nie znaleziono wpisu do usunięcia');
}

function updateTotalEarnings() {
    const total = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    const totalElement = document.getElementById('totalEarnings');
    if (totalElement) {
        totalElement.textContent = total.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' NOK';
    }
}

// Flights functions
function toggleFlightForm() {
    const form = document.getElementById('flightForm');
    form.classList.toggle('active');

    if (form.classList.contains('active')) {
        document.getElementById('flightNumber').value = '';
        document.getElementById('flightGate').value = '';
        document.getElementById('flightSeat').value = '';
        document.getElementById('flightDate').valueAsDate = new Date();
        document.getElementById('flightDirection').value = 'toNorway';
    }
}

function saveFlight() {
    const flightNumber = document.getElementById('flightNumber').value;
    const gate = document.getElementById('flightGate').value;
    const seat = document.getElementById('flightSeat').value;
    const date = document.getElementById('flightDate').value;
    const direction = document.getElementById('flightDirection').value;

    if (!flightNumber || !date) {
        alert('Proszę wypełnij numer lotu i datę');
        return;
    }

    const flight = {
        id: Date.now(),
        flightNumber: flightNumber,
        gate: gate,
        seat: seat,
        date: date,
        direction: direction
    };

    flights.push(flight);
    StorageManager.saveFlights(flights);
    displayFlights();
    toggleFlightForm();
}

function loadFlights() {
    flights = StorageManager.loadFlights();
    displayFlights();
}

function displayFlights() {
    const flightsList = document.getElementById('flightsList');
    if (!flightsList) {
        return;
    }

    flightsList.innerHTML = '';

    const sortedFlights = [...flights].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedFlights.forEach((flight) => {
        const flightCard = document.createElement('div');
        flightCard.className = 'flight-card';

        const directionText = flight.direction === 'toNorway' ? 'Do Norwegii' : 'Do Polski';
        const directionIcon = flight.direction === 'toNorway' ? '🇳🇴' : '🇵🇱';

        flightCard.innerHTML = `
            <button class="delete-flight-btn" onclick="deleteFlight(${flight.id})">×</button>
            <div style="text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 2rem;">${directionIcon}</div>
                <div style="font-weight: 600; color: #666;">${directionText}</div>
                <div style="color: #999; font-size: 0.9rem;">${new Date(flight.date).toLocaleDateString('pl-PL')}</div>
            </div>
            <div class="flight-info">
                <div class="flight-detail">
                    <div class="flight-detail-label">Numer lotu</div>
                    <div class="flight-detail-value">${flight.flightNumber}</div>
                </div>
                <div class="flight-detail">
                    <div class="flight-detail-label">Bramka</div>
                    <div class="flight-detail-value">${flight.gate || '-'}</div>
                </div>
                <div class="flight-detail">
                    <div class="flight-detail-label">Miejsce</div>
                    <div class="flight-detail-value">${flight.seat || '-'}</div>
                </div>
            </div>
        `;

        flightsList.appendChild(flightCard);
    });
}

function deleteFlight(id) {
    for (let i = 0; i < flights.length; i++) {
        if (flights[i].id == id) {
            flights.splice(i, 1);
            StorageManager.saveFlights(flights);
            displayFlights();
            alert('✅ Lot został usunięty!');
            return;
        }
    }
    alert('❌ Nie znaleziono lotu do usunięcia');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    loadEarnings();
    loadFlights();

    const lastDepartureElement = document.getElementById('lastDeparture');
    if (lastDepartureElement) {
        lastDepartureElement.valueAsDate = new Date();
    }
});