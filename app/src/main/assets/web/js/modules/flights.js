import { StorageManager } from '../utils/storage.js';

export class FlightsManager {
    constructor() {
        this.flights = [];
    }

    loadFlights() {
        this.flights = StorageManager.loadFlights();
        this.displayFlights();
    }

    toggleFlightForm() {
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

    saveFlight() {
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

        this.flights.push(flight);
        StorageManager.saveFlights(this.flights);
        this.displayFlights();
        this.toggleFlightForm();
    }

    displayFlights() {
        const flightsList = document.getElementById('flightsList');
        if (!flightsList) {
            console.error('flightsList element not found!');
            return;
        }

        flightsList.innerHTML = '';

        const sortedFlights = [...this.flights].sort((a, b) => new Date(b.date) - new Date(a.date));

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
                        <div class="flight-detail-label">Miejsce