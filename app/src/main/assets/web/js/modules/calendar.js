import { MONTH_NAMES, DAY_NAMES, ELEMENTS } from '../config/constants.js';
import { StorageManager } from '../utils/storage.js';

export class CalendarManager {
    constructor() {
        this.rotationData = [];
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
    }

    calculateRotationsFromDate(lastDeparture) {
        this.rotationData = [];
        let currentWorkStart = new Date(lastDeparture);
        currentWorkStart.setHours(0, 0, 0, 0);

        console.log("Rozpoczynam obliczenia rotacji od:", currentWorkStart.toLocaleDateString());

        // Generuj rotacje na cały rok (około 10-11 pełnych cykli)
        for (let i = 0; i < 12; i++) {
            // PRACA W NORWEGII - 15 dni
            // Od daty wylotu do daty wylotu + 14 dni (łącznie 15 dni)
            const workStart = new Date(currentWorkStart);
            const workEnd = new Date(currentWorkStart);
            workEnd.setDate(workEnd.getDate() + 14);

            this.rotationData.push({
                start: new Date(workStart),
                end: new Date(workEnd),
                type: 'work'
            });

            console.log(`Rotacja ${i + 1} - Praca: ${workStart.toLocaleDateString()} - ${workEnd.toLocaleDateString()}`);

            // ODPOCZYNEK W POLSCE - 20 dni
            // Od dnia po ostatnim dniu pracy przez 20 dni
            const restStart = new Date(workEnd);
            restStart.setDate(restStart.getDate() + 1);

            const restEnd = new Date(restStart);
            restEnd.setDate(restEnd.getDate() + 19);

            this.rotationData.push({
                start: new Date(restStart),
                end: new Date(restEnd),
                type: 'rest'
            });

            console.log(`Rotacja ${i + 1} - Odpoczynek: ${restStart.toLocaleDateString()} - ${restEnd.toLocaleDateString()}`);

            // NASTĘPNY WYLOT - dzień po zakończeniu odpoczynku
            currentWorkStart = new Date(restEnd);
            currentWorkStart.setDate(currentWorkStart.getDate() + 1);
        }

        // Sprawdź poprawność pierwszych rotacji
        console.log("Weryfikacja pierwszych rotacji:");
        if (this.rotationData.length >= 4) {
            console.log("1. Praca:", this.rotationData[0].start.toLocaleDateString(), "-", this.rotationData[0].end.toLocaleDateString());
            console.log("2. Odpoczynek:", this.rotationData[1].start.toLocaleDateString(), "-", this.rotationData[1].end.toLocaleDateString());
            console.log("3. Praca:", this.rotationData[2].start.toLocaleDateString(), "-", this.rotationData[2].end.toLocaleDateString());
            console.log("4. Odpoczynek:", this.rotationData[3].start.toLocaleDateString(), "-", this.rotationData[3].end.toLocaleDateString());
        }
    }

    updateStatusCards() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Znajdź aktualną rotację
        let currentRotation = this.rotationData.find(rotation =>
            today >= rotation.start && today <= rotation.end
        );

        if (currentRotation) {
            const daysLeft = Math.ceil((currentRotation.end - today) / (1000 * 60 * 60 * 24)) + 1;

            if (currentRotation.type === 'work') {
                // W pracy - pokazuj dni do powrotu
                document.getElementById(ELEMENTS.CURRENT_DAYS).textContent = daysLeft;
                document.getElementById(ELEMENTS.CURRENT_LABEL).textContent = 'Dni do powrotu';
                document.getElementById(ELEMENTS.CURRENT_STATUS).className = 'status-card work';

                // Znajdź następny odpoczynek
                const nextRest = this.rotationData.find(rotation =>
                    rotation.type === 'rest' && rotation.start > today
                );
                if (nextRest) {
                    const daysToRest = Math.ceil((nextRest.start - today) / (1000 * 60 * 60 * 24));
                    document.getElementById(ELEMENTS.NEXT_DAYS).textContent = daysToRest;
                    document.getElementById(ELEMENTS.NEXT_LABEL).textContent = 'Dni do odpoczynku';
                    document.getElementById(ELEMENTS.NEXT_STATUS).className = 'status-card rest';
                }
            } else {
                // Na odpoczynku - pokazuj dni do wylotu
                document.getElementById(ELEMENTS.CURRENT_DAYS).textContent = daysLeft;
                document.getElementById(ELEMENTS.CURRENT_LABEL).textContent = 'Dni odpoczynku';
                document.getElementById(ELEMENTS.CURRENT_STATUS).className = 'status-card rest';

                // Znajdź następną pracę
                const nextWork = this.rotationData.find(rotation =>
                    rotation.type === 'work' && rotation.start > today
                );
                if (nextWork) {
                    const daysToWork = Math.ceil((nextWork.start - today) / (1000 * 60 * 60 * 24));
                    document.getElementById(ELEMENTS.NEXT_DAYS).textContent = daysToWork;
                    document.getElementById(ELEMENTS.NEXT_LABEL).textContent = 'Dni do wylotu';
                    document.getElementById(ELEMENTS.NEXT_STATUS).className = 'status-card work';
                }
            }
        } else {
            this.setDefaultStatusCards();
        }
    }

    setDefaultStatusCards() {
        document.getElementById(ELEMENTS.CURRENT_DAYS).textContent = '--';
        document.getElementById(ELEMENTS.CURRENT_LABEL).textContent = 'Obecnie';
        document.getElementById(ELEMENTS.CURRENT_STATUS).className = 'status-card';

        document.getElementById(ELEMENTS.NEXT_DAYS).textContent = '--';
        document.getElementById(ELEMENTS.NEXT_LABEL).textContent = 'Następne';
        document.getElementById(ELEMENTS.NEXT_STATUS).className = 'status-card';
    }

    generateCalendar() {
        const calendar = document.getElementById(ELEMENTS.CALENDAR);
        const calendarTitle = document.getElementById('calendarTitle');

        calendar.innerHTML = '';
        calendarTitle.textContent = `${MONTH_NAMES[this.currentMonth]} ${this.currentYear}`;

        // Nagłówki dni
        DAY_NAMES.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const startDay = firstDay.getDay();

        // Puste dni przed pierwszym dniem miesiąca
        for (let i = 0; i < startDay; i++) {
            calendar.appendChild(document.createElement('div')).className = 'calendar-day';
        }

        // Dni miesiąca
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(this.currentYear, this.currentMonth, day);
            currentDate.setHours(0, 0, 0, 0);

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            // Oznacz dzisiejszy dzień
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // Znajdź rotację dla tego dnia
            const rotation = this.rotationData.find(rotation => {
                const rotStart = new Date(rotation.start);
                rotStart.setHours(0, 0, 0, 0);
                const rotEnd = new Date(rotation.end);
                rotEnd.setHours(0, 0, 0, 0);

                return currentDate >= rotStart && currentDate <= rotEnd;
            });

            if (rotation) {
                dayElement.classList.add(rotation.type);
            }

            calendar.appendChild(dayElement);
        }
    }

    generateUpcomingEvents() {
        const upcomingEvents = document.getElementById(ELEMENTS.UPCOMING_EVENTS);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let events = [];

        this.rotationData.forEach(rotation => {
            // Dodaj wydarzenie początku rotacji (jeśli w przyszłości)
            if (rotation.start > today) {
                const label = rotation.type === 'work' ? 'Wylot do Norwegii' : 'Początek odpoczynku';
                events.push({
                    date: rotation.start,
                    type: rotation.type,
                    label: label
                });
            }

            // Dodaj wydarzenie końca pracy (powrót do Polski)
            if (rotation.type === 'work' && rotation.end >= today) {
                const returnDate = new Date(rotation.end);
                returnDate.setDate(returnDate.getDate() + 1); // Dzień po ostatnim dniu pracy

                if (returnDate > today) {
                    events.push({
                        date: returnDate,
                        type: 'rest',
                        label: 'Powrót do Polski'
                    });
                }
            }
        });

        // Sortuj wydarzenia po dacie i weź 5 najbliższych
        events.sort((a, b) => a.date - b.date);
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

    changeMonth(direction) {
        this.currentMonth += direction;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.generateCalendar();
    }

    calculateRotations() {
        const lastDepartureInput = document.getElementById(ELEMENTS.LAST_DEPARTURE);
        const lastDeparture = new Date(lastDepartureInput.value);

        if (!lastDeparture || isNaN(lastDeparture.getTime())) {
            alert('Proszę wprowadź datę ostatniego wylotu.');
            return;
        }

        this.calculateRotationsFromDate(lastDeparture);
        StorageManager.saveRotationData(lastDeparture, this.rotationData);

        document.getElementById(ELEMENTS.SETUP_SECTION).classList.add('hidden');
        document.getElementById(ELEMENTS.MAIN_APP).classList.remove('hidden');

        this.updateStatusCards();
        this.generateCalendar();
        this.generateUpcomingEvents();
    }

    showEditSection() {
        document.getElementById(ELEMENTS.SETUP_SECTION).classList.remove('hidden');
        document.getElementById(ELEMENTS.MAIN_APP).classList.add('hidden');

        const savedData = StorageManager.loadRotationData();
        if (savedData) {
            const savedDate = new Date(savedData.lastDeparture);
            document.getElementById(ELEMENTS.LAST_DEPARTURE).valueAsDate = savedDate;
        }
    }

    loadSavedData() {
        const savedData = StorageManager.loadRotationData();
        if (savedData) {
            const lastDeparture = new Date(savedData.lastDeparture);
            this.calculateRotationsFromDate(lastDeparture);

            document.getElementById(ELEMENTS.SETUP_SECTION).classList.add('hidden');
            document.getElementById(ELEMENTS.MAIN_APP).classList.remove('hidden');

            this.updateStatusCards();
            this.generateCalendar();
            this.generateUpcomingEvents();
            return true;
        } else {
            document.getElementById(ELEMENTS.SETUP_SECTION).classList.remove('hidden');
            document.getElementById(ELEMENTS.MAIN_APP).classList.add('hidden');
            return false;
        }
    }

    updateStatistics() {
        if (this.rotationData.length === 0) return;

        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);

        let workDays = 0;
        let restDays = 0;

        this.rotationData.forEach(rotation => {
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
}

// Make functions globally available for onclick handlers
window.calculateRotations = function() {
    if (window.calendarManager) {
        window.calendarManager.calculateRotations();
    }
};

window.showEditSection = function() {
    if (window.calendarManager) {
        window.calendarManager.showEditSection();
    }
};

window.changeMonth = function(direction) {
    if (window.calendarManager) {
        window.calendarManager.changeMonth(direction);
    }
};