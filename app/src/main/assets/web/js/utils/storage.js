import { CONFIG } from '../config/constants.js';

// Utilities dla LocalStorage
export class StorageManager {
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

        // Fallback to memory storage
        return window[`saved${key}`] || null;
    }

    static saveRotationData(lastDeparture, rotationData) {
        const dataToSave = {
            lastDeparture: lastDeparture.toISOString(),
            savedAt: new Date().toISOString()
        };

        this.save(CONFIG.STORAGE_KEYS.ROTATION_DATA, dataToSave);

        // Send data to Android widget if available
        if (typeof AndroidWidget !== 'undefined') {
            const widgetData = {
                lastDeparture: lastDeparture.toISOString(),
                rotations: rotationData.map(r => ({
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

    static saveEarnings(earnings) {
        this.save(CONFIG.STORAGE_KEYS.EARNINGS, earnings);
    }

    static loadEarnings() {
        return this.load(CONFIG.STORAGE_KEYS.EARNINGS) || [];
    }

    static saveFlights(flights) {
        this.save(CONFIG.STORAGE_KEYS.FLIGHTS, flights);
    }

    static loadFlights() {
        return this.load(CONFIG.STORAGE_KEYS.FLIGHTS) || [];
    }
}