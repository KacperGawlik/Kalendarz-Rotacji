// Konfiguracja i stałe
const CONFIG = {
    APP_NAME: 'Kalendarz Rotacji',
    VERSION: '1.0.0',
    STORAGE_KEYS: {
        ROTATION_DATA: 'rotationData',
        EARNINGS: 'earnings',
        FLIGHTS: 'flights',
        EXCHANGE_RATE: 'exchangeRate',
        WEATHER_SETTINGS: 'weatherSettings',
        WEATHER_DATA: 'weatherData'
    },
    NBP_API_URL: 'https://api.nbp.pl/api/exchangerates/rates/a/nok/?format=json',
    REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minut
    // PRAWDZIWY KLUCZ API! 🌤️
    WEATHER_API_KEY: 'a8db668d4a3344e6819113419252507',
    WEATHER_API_URL: 'https://api.weatherapi.com/v1',
    WEATHER_REFRESH_INTERVAL: 30 * 60 * 1000 // 30 minut
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
let currentExchangeRate = null;
let previousExchangeRate = null;
let refreshInterval = null;
let weatherRefreshInterval = null;
let weatherSettings = {
    norwayCity: 'Oslo',
    polandCity: 'Kraków',
    useLocation: false,
    alertsEnabled: true
};
let weatherData = {
    norway: null,
    poland: null,
    lastUpdate: null
};

// Weather Icons Mapping
const WEATHER_ICONS = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

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

    static saveExchangeRate(rateData) {
        this.save(CONFIG.STORAGE_KEYS.EXCHANGE_RATE, rateData);
    }

    static loadExchangeRate() {
        return this.load(CONFIG.STORAGE_KEYS.EXCHANGE_RATE);
    }

    static saveWeatherSettings(settings) {
        this.save(CONFIG.STORAGE_KEYS.WEATHER_SETTINGS, settings);
    }

    static loadWeatherSettings() {
        return this.load(CONFIG.STORAGE_KEYS.WEATHER_SETTINGS) || {
            norwayCity: 'Oslo',
            polandCity: 'Kraków',
            useLocation: false,
            alertsEnabled: true
        };
    }

    static saveWeatherData(data) {
        this.save(CONFIG.STORAGE_KEYS.WEATHER_DATA, data);
    }

    static loadWeatherData() {
        return this.load(CONFIG.STORAGE_KEYS.WEATHER_DATA);
    }
}

// Currency Exchange Functions (zachowane z poprzedniej wersji)
async function fetchExchangeRate() {
    const refreshBtn = document.getElementById('refreshBtn');
    const rateValue = document.getElementById('rateValue');

    try {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');

        const response = await fetch(CONFIG.NBP_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const rate = data.rates[0].mid;
        const date = new Date(data.rates[0].effectiveDate);

        if (currentExchangeRate) {
            previousExchangeRate = currentExchangeRate;
        }

        currentExchangeRate = {
            rate: rate,
            date: date,
            fetchedAt: new Date()
        };

        StorageManager.saveExchangeRate(currentExchangeRate);
        updateExchangeRateDisplay();
        updateTotalEarningsPLN();
        updateEarningsDisplayWithPLN();

        if (previousExchangeRate) {
            const changePercent = ((rate - previousExchangeRate.rate) / previousExchangeRate.rate) * 100;
            if (Math.abs(changePercent) > 2) {
                showRateChangeAlert(changePercent);
            }
        }

        console.log('💱 Kurs NOK/PLN zaktualizowany:', rate);

    } catch (error) {
        console.error('❌ Błąd pobierania kursu:', error);
        rateValue.textContent = 'Błąd';
        document.getElementById('lastUpdate').textContent = 'Błąd pobierania danych';
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
    }
}

function updateExchangeRateDisplay() {
    if (!currentExchangeRate) return;

    const rateValue = document.getElementById('rateValue');
    const lastUpdate = document.getElementById('lastUpdate');
    const changePercent = document.getElementById('changePercent');
    const changeDirection = document.getElementById('changeDirection');
    const rateChange = document.getElementById('rateChange');

    rateValue.textContent = currentExchangeRate.rate.toFixed(4);
    lastUpdate.textContent = `Ostatnia aktualizacja: ${currentExchangeRate.fetchedAt.toLocaleString('pl-PL')}`;

    if (previousExchangeRate) {
        const change = ((currentExchangeRate.rate - previousExchangeRate.rate) / previousExchangeRate.rate) * 100;
        changePercent.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;

        if (change > 0) {
            changeDirection.textContent = '📈';
            rateChange.className = 'rate-change positive';
        } else if (change < 0) {
            changeDirection.textContent = '📉';
            rateChange.className = 'rate-change negative';
        } else {
            changeDirection.textContent = '📊';
            rateChange.className = 'rate-change';
        }
    }
}

function showRateChangeAlert(changePercent) {
    const direction = changePercent > 0 ? 'wzrósł' : 'spadł';
    const emoji = changePercent > 0 ? '📈' : '📉';
    const message = `${emoji} Kurs NOK/PLN ${direction} o ${Math.abs(changePercent).toFixed(2)}%!`;

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Kalendarz Rotacji', {
            body: message,
            icon: '/android-chrome-192x192.png'
        });
    } else {
        alert(message);
    }
}

function toggleCurrencyCalculator() {
    const calculator = document.getElementById('currencyCalculator');
    calculator.classList.toggle('active');
}

function convertNOKToPLN() {
    if (!currentExchangeRate) return;

    const nokInput = document.getElementById('nokInput');
    const nokResult = document.getElementById('nokResult');
    const amount = parseFloat(nokInput.value) || 0;
    const result = amount * currentExchangeRate.rate;

    nokResult.textContent = `= ${result.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} PLN`;
}

function convertPLNToNOK() {
    if (!currentExchangeRate) return;

    const plnInput = document.getElementById('plnInput');
    const plnResult = document.getElementById('plnResult');
    const amount = parseFloat(plnInput.value) || 0;
    const result = amount / currentExchangeRate.rate;

    plnResult.textContent = `= ${result.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} NOK`;
}

function setNOKAmount(amount) {
    document.getElementById('nokInput').value = amount;
    convertNOKToPLN();
}

function setPLNAmount(amount) {
    document.getElementById('plnInput').value = amount;
    convertPLNToNOK();
}

function updateTotalEarningsPLN() {
    if (!currentExchangeRate) return;

    const total = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    const totalPLN = total * currentExchangeRate.rate;
    const totalPLNElement = document.getElementById('totalEarningsPLN');

    if (totalPLNElement) {
        totalPLNElement.textContent = `≈ ${totalPLN.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} PLN`;
    }
}

function updateEarningsDisplayWithPLN() {
    if (!currentExchangeRate) return;

    const earningAmounts = document.querySelectorAll('.earning-amount');
    earningAmounts.forEach((amountElement, index) => {
        const earning = earnings.find(e => amountElement.textContent.includes(e.amount.toString()));
        if (earning) {
            const plnAmount = earning.amount * currentExchangeRate.rate;

            let plnElement = amountElement.parentNode.querySelector('.earning-amount-pln');
            if (!plnElement) {
                plnElement = document.createElement('div');
                plnElement.className = 'earning-amount-pln';
                amountElement.parentNode.insertBefore(plnElement, amountElement.nextSibling);
            }

            plnElement.textContent = `≈ ${plnAmount.toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })} PLN`;
        }
    });
}

function startCurrencyRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(fetchExchangeRate, CONFIG.REFRESH_INTERVAL);
    console.log('🔄 Auto-refresh kursu uruchomiony (co 10 minut)');
}

function loadSavedExchangeRate() {
    const savedRate = StorageManager.loadExchangeRate();
    if (savedRate) {
        currentExchangeRate = {
            rate: savedRate.rate,
            date: new Date(savedRate.date),
            fetchedAt: new Date(savedRate.fetchedAt)
        };

        const hourAgo = new Date();
        hourAgo.setHours(hourAgo.getHours() - 1);

        if (currentExchangeRate.fetchedAt > hourAgo) {
            updateExchangeRateDisplay();
            updateTotalEarningsPLN();
        } else {
            fetchExchangeRate();
        }
    } else {
        fetchExchangeRate();
    }
}



// POPRAWIONA funkcja fetchWeatherData - bez mock danych
async function fetchWeatherData(country) {
    const refreshBtn = document.querySelector(`#${country}WeatherCard .refresh-weather-btn`);
    const weatherCard = document.getElementById(`${country}WeatherCard`);

    try {
        refreshBtn.disabled = true;
        weatherCard.classList.add('loading');

        let city = country === 'norway' ? weatherSettings.norwayCity : weatherSettings.polandCity;

        console.log(`🌤️ Pobieranie pogody dla ${city}...`);

        // Pobierz aktualną pogodę
        const currentUrl = `${CONFIG.WEATHER_API_URL}/current.json?key=${CONFIG.WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`;
        console.log('🔗 WeatherAPI Current URL:', currentUrl);

        const currentResponse = await fetch(currentUrl);

        if (!currentResponse.ok) {
            const errorText = await currentResponse.text();
            console.log('❌ WeatherAPI Current Error:', errorText);
            throw new Error(`WeatherAPI current error: ${currentResponse.status} - ${errorText}`);
        }

        const currentData = await currentResponse.json();
        console.log('✅ WeatherAPI Current Data:', currentData);

        // Konwertuj dane WeatherAPI.com do formatu OpenWeatherMap
        const convertedCurrentData = {
            name: currentData.location.name,
            coord: {
                lat: currentData.location.lat,
                lon: currentData.location.lon
            },
            main: {
                temp: Math.round(currentData.current.temp_c),
                feels_like: Math.round(currentData.current.feelslike_c),
                humidity: currentData.current.humidity,
                pressure: currentData.current.pressure_mb
            },
            weather: [{
                main: currentData.current.condition.text,
                description: currentData.current.condition.text.toLowerCase(),
                icon: getWeatherAPIIcon(currentData.current.condition.code, currentData.current.is_day)
            }],
            wind: {
                speed: currentData.current.wind_kph / 3.6 // konwersja km/h na m/s
            },
            sys: {
                sunrise: new Date().getTime() / 1000 - 6 * 3600,
                sunset: new Date().getTime() / 1000 + 6 * 3600
            }
        };

         // Pobierz prognozę
                let forecastData = null;
                try {
                    const forecastUrl = `${CONFIG.WEATHER_API_URL}/forecast.json?key=${CONFIG.WEATHER_API_KEY}&q=${encodeURIComponent(city)}&days=3&aqi=no&alerts=no`;
                    console.log('🔗 WeatherAPI Forecast URL:', forecastUrl);

                    const forecastResponse = await fetch(forecastUrl);
                    if (forecastResponse.ok) {
                        const rawForecast = await forecastResponse.json();
                        console.log('✅ WeatherAPI Forecast Data:', rawForecast);
                        forecastData = convertWeatherAPIForecast(rawForecast);
                        console.log('✅ Converted Forecast Data:', forecastData);
                    } else {
                        const forecastError = await forecastResponse.text();
                        console.log('⚠️ Forecast API Error:', forecastError);
                    }
                } catch (forecastError) {
                    console.log('⚠️ Błąd prognozy (kontynuuję z aktualną pogodą):', forecastError);
                }

                // Zapisz dane
                weatherData[country] = {
                    current: convertedCurrentData,
                    forecast: forecastData,
                    lastUpdate: new Date()
                };

                StorageManager.saveWeatherData(weatherData);

                // Aktualizuj wyświetlanie
                updateWeatherDisplay(country, convertedCurrentData);

                // Aktualizuj prognozę TYLKO jeśli są rzeczywiste dane
                if (forecastData && forecastData.list && forecastData.list.length > 0) {
                    console.log(`🔄 Aktualizuję prognozę dla ${country}...`);
                    updateForecastDisplay(country, forecastData);
                } else {
                    console.log(`⚠️ Brak danych prognozy dla ${country}`);
                    clearForecastDisplay(country);
                }

                // Sprawdź alerty pogodowe
                if (weatherSettings.alertsEnabled) {
                    checkWeatherAlerts(convertedCurrentData, forecastData);
                }

                console.log(`✅ Pogoda WeatherAPI dla ${city} - ${convertedCurrentData.main.temp}°C, ${convertedCurrentData.weather[0].description}`);

            } catch (error) {
                console.error(`❌ Błąd pobierania pogody dla ${country}:`, error);
                showWeatherError(country, error.message);

            } finally {
                refreshBtn.disabled = false;
                weatherCard.classList.remove('loading');
            }
        }

// Funkcja pomocnicza - konwersja ikon WeatherAPI na emoji
function getWeatherAPIIcon(code, isDay) {
    // WeatherAPI condition codes: https://www.weatherapi.com/docs/weather_conditions.json
    const iconMap = {
        1000: isDay ? '☀️' : '🌙', // Sunny/Clear
        1003: '⛅', // Partly cloudy
        1006: '☁️', // Cloudy
        1009: '☁️', // Overcast
        1030: '🌫️', // Mist
        1063: '🌦️', // Patchy rain possible
        1066: '🌨️', // Patchy snow possible
        1069: '🌨️', // Patchy sleet possible
        1072: '🌨️', // Patchy freezing drizzle
        1087: '⛈️', // Thundery outbreaks
        1114: '❄️', // Blowing snow
        1117: '❄️', // Blizzard
        1135: '🌫️', // Fog
        1147: '🌫️', // Freezing fog
        1150: '🌦️', // Patchy light drizzle
        1153: '🌦️', // Light drizzle
        1168: '🌨️', // Freezing drizzle
        1171: '🌨️', // Heavy freezing drizzle
        1180: '🌧️', // Patchy light rain
        1183: '🌧️', // Light rain
        1186: '🌧️', // Moderate rain at times
        1189: '🌧️', // Moderate rain
        1192: '🌧️', // Heavy rain at times
        1195: '🌧️', // Heavy rain
        1198: '🌨️', // Light freezing rain
        1201: '🌨️', // Moderate or heavy freezing rain
        1204: '🌨️', // Light sleet
        1207: '🌨️', // Moderate or heavy sleet
        1210: '❄️', // Patchy light snow
        1213: '❄️', // Light snow
        1216: '❄️', // Patchy moderate snow
        1219: '❄️', // Moderate snow
        1222: '❄️', // Patchy heavy snow
        1225: '❄️', // Heavy snow
        1237: '🌨️', // Ice pellets
        1240: '🌦️', // Light rain shower
        1243: '🌧️', // Moderate or heavy rain shower
        1246: '🌧️', // Torrential rain shower
        1249: '🌨️', // Light sleet showers
        1252: '🌨️', // Moderate or heavy sleet showers
        1255: '❄️', // Light snow showers
        1258: '❄️', // Moderate or heavy snow showers
        1261: '🌨️', // Light showers of ice pellets
        1264: '🌨️', // Moderate or heavy showers of ice pellets
        1273: '⛈️', // Patchy light rain with thunder
        1276: '⛈️', // Moderate or heavy rain with thunder
        1279: '⛈️', // Patchy light snow with thunder
        1282: '⛈️'  // Moderate or heavy snow with thunder
    };

    return iconMap[code] || '⛅';
}

// Funkcja pomocnicza - konwersja prognozy WeatherAPI
function convertWeatherAPIForecast(data) {
    if (!data.forecast || !data.forecast.forecastday) return null;

    // Konwertuj do formatu podobnego do OpenWeatherMap
    return {
        list: data.forecast.forecastday.flatMap(day =>
            day.hour.map(hour => ({
                dt: new Date(hour.time).getTime() / 1000,
                main: {
                    temp: hour.temp_c,
                    feels_like: hour.feelslike_c,
                    humidity: hour.humidity
                },
                weather: [{
                    main: hour.condition.text,
                    description: hour.condition.text.toLowerCase(),
                    icon: getWeatherAPIIcon(hour.condition.code, hour.is_day)
                }],
                wind: {
                    speed: hour.wind_kph / 3.6
                },
                rain: hour.precip_mm > 0 ? { '1h': hour.precip_mm } : null
            }))
        )
    };
}

// Funkcja tłumacząca opisy pogody na polski
function translateWeatherDescription(englishDesc) {
    const translations = {
        'sunny': 'słonecznie',
        'clear': 'bezchmurnie',
        'partly cloudy': 'częściowo pochmurno',
        'cloudy': 'pochmurno',
        'overcast': 'zachmurzenie całkowite',
        'mist': 'mgła',
        'fog': 'mgła',
        'light rain': 'lekki deszcz',
        'moderate rain': 'umiarkowany deszcz',
        'heavy rain': 'silny deszcz',
        'light snow': 'lekki śnieg',
        'snow': 'śnieg',
        'thunderstorm': 'burza',
        'drizzle': 'mżawka',
        'patchy rain possible': 'możliwy przelotny deszcz',
        'patchy snow possible': 'możliwy przelotny śnieg'
    };

    const lowerDesc = englishDesc.toLowerCase().trim();

    if (translations[lowerDesc]) {
        return translations[lowerDesc];
    }

    // Jeśli nie ma dokładnego dopasowania, spróbuj częściowego
    for (const [eng, pol] of Object.entries(translations)) {
        if (lowerDesc.includes(eng)) {
            return pol;
        }
    }

    return englishDesc; // Jeśli nic nie pasuje, zwróć oryginalny
}

function updateWeatherDisplay(country, data) {
    const prefix = country;

    // Lokalizacja i czas aktualizacji
    document.getElementById(`${prefix}Location`).textContent =
        `${country === 'norway' ? '🇳🇴' : '🇵🇱'} ${data.name}`;
    document.getElementById(`${prefix}UpdateTime`).textContent =
        `Aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;

    // Ikona pogody
    const iconCode = data.weather[0].icon;
    document.getElementById(`${prefix}WeatherIcon`).textContent =
        WEATHER_ICONS[iconCode] || '⛅';

    // Temperatura
    document.getElementById(`${prefix}Temperature`).textContent =
        `${Math.round(data.main.temp)}°C`;
    document.getElementById(`${prefix}FeelsLike`).textContent =
        `Odczuwalna: ${Math.round(data.main.feels_like)}°C`;
    document.getElementById(`${prefix}Description`).textContent =
        translateWeatherDescription(data.weather[0].description);

    // Szczegóły
    document.getElementById(`${prefix}Humidity`).textContent = `${data.main.humidity}%`;
    document.getElementById(`${prefix}Wind`).textContent =
        `${Math.round(data.wind.speed * 3.6)} km/h`;


    // Porada ubraniowa
    updateClothingAdvice(country, data);

    // Efekty wizualne
    updateWeatherEffects(country, data);

    // Sprawdź polarne noce/białe noce dla Norwegii
    if (country === 'norway') {
        checkPolarConditions(data);
    }
}

function updateClothingAdvice(country, data) {
    const temp = data.main.temp;
    const weather = data.weather[0].main.toLowerCase();
    const windSpeed = data.wind.speed * 3.6;

    let advice = '';

    if (temp < -10) {
        advice = 'Bardzo zimno! Kurtka zimowa, czapka, rękawiczki i ciepłe buty.';
    } else if (temp < 0) {
        advice = 'Zimno. Kurtka, czapka i rękawiczki. Uważaj na oblodzenia.';
    } else if (temp < 10) {
        advice = 'Chłodno. Kurtka lub gruby sweter. Długie spodnie.';
    } else if (temp < 20) {
        advice = 'Umiarkowanie. Bluza lub lekka kurtka wystarczy.';
    } else if (temp < 25) {
        advice = 'Przyjemnie. T-shirt i długie spodnie lub lekkie szorty.';
    } else {
        advice = 'Ciepło! T-shirt i szorty. Nie zapomnij o kremie z filtrem.';
    }

    if (weather.includes('rain') || weather.includes('drizzle')) {
        advice += ' 🌧️ Weź parasol lub kurtkę przeciwdeszczową.';
    }
    if (weather.includes('snow')) {
        advice += ' ❄️ Uwaga na śnieg! Antypoślizgowe buty.';
    }
    if (windSpeed > 20) {
        advice += ' 💨 Silny wiatr - dodatkowa warstwa odzieży.';
    }

    document.getElementById(`${country}ClothingAdvice`).innerHTML =
        `<strong>💡 Porada:</strong> <span>${advice}</span>`;
}

function updateWeatherEffects(country, data) {
    const weatherCard = document.getElementById(`${country}WeatherCard`);
    const weather = data.weather[0].main.toLowerCase();
    const isNight = data.weather[0].icon.includes('n');

    weatherCard.classList.remove('sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'night');

    if (isNight) {
        weatherCard.classList.add('night');
    } else if (weather.includes('clear')) {
        weatherCard.classList.add('sunny');
    } else if (weather.includes('cloud')) {
        weatherCard.classList.add('cloudy');
    } else if (weather.includes('rain') || weather.includes('drizzle')) {
        weatherCard.classList.add('rainy');
    } else if (weather.includes('snow')) {
        weatherCard.classList.add('snowy');
    } else if (weather.includes('thunderstorm')) {
        weatherCard.classList.add('stormy');
    }
}

function checkPolarConditions(data) {
    const lat = data.coord.lat;
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    const dayLength = (sunset - sunrise) / (1000 * 60 * 60);

    let polarInfo = '';

    if (lat > 66.5) {
        const month = new Date().getMonth();

        if (dayLength < 2 && (month === 11 || month === 0 || month === 1)) {
            polarInfo = `
                <div class="polar-info">
                    <h4>🌑 Noc polarna</h4>
                    <p>W tej lokalizacji słońce prawie nie wschodzi. To czas nocy polarnej w północnej Norwegii.</p>
                </div>
            `;
        } else if (dayLength > 20 && (month >= 4 && month <= 7)) {
            polarInfo = `
                <div class="polar-info white-nights">
                    <h4>🌞 Białe noce</h4>
                    <p>Słońce świeci prawie całą dobę! To czas białych nocy w północnej Norwegii.</p>
                </div>
            `;
        }
    }

    const weatherCard = document.getElementById('norwayWeatherCard');
    let existingPolarInfo = weatherCard.querySelector('.polar-info');
    if (existingPolarInfo) {
        existingPolarInfo.remove();
    }

    if (polarInfo) {
        weatherCard.insertAdjacentHTML('beforeend', polarInfo);
    }
}

// ZASTĄP CAŁĄ SEKCJĘ prognoz (od updateForecastDisplay do końca updateDailyForecast) tym kodem:

function updateForecastDisplay(country, forecastData) {
    updateHourlyForecast(country, forecastData);
    updateDailyForecast(country, forecastData);
}

function updateHourlyForecast(country, data) {
    const hourlyItems = document.getElementById(`${country}HourlyItems`);
    if (!hourlyItems) {
        console.log(`❌ Nie znaleziono elementu ${country}HourlyItems`);
        return;
    }

    hourlyItems.innerHTML = '';

    if (!data.list || data.list.length === 0) {
        hourlyItems.innerHTML = '<div class="no-forecast">Brak danych prognozy godzinowej</div>';
        return;
    }

    // Aktualna godzina
    const now = new Date();
    const currentHour = now.getHours();

    console.log(`🕐 Aktualna godzina: ${currentHour}:${now.getMinutes()}`);

    // Filtruj dane prognozy - pokaż tylko od aktualnej godziny lub później
    const futureItems = data.list.filter(item => {
        const itemTime = new Date(item.dt * 1000);
        return itemTime >= now; // Tylko przyszłe godziny
    });

    console.log(`📊 Znaleziono ${futureItems.length} przyszłych pozycji prognozy`);

    // Pokaż następne 24 godziny (lub ile mamy dostępnych)
    const itemsToShow = futureItems.slice(0, 24);

    if (itemsToShow.length === 0) {
        hourlyItems.innerHTML = '<div class="no-forecast">Brak przyszłych danych prognozy godzinowej</div>';
        return;
    }

    itemsToShow.forEach((item, index) => {
        const time = new Date(item.dt * 1000);
        const temp = Math.round(item.main.temp);
        const icon = WEATHER_ICONS[item.weather[0].icon] || '⛅';
        const desc = translateWeatherDescription(item.weather[0].description);

        // Sprawdź czy są dane o opadach
        let rain = '';
        if (item.rain) {
            const rainAmount = item.rain['1h'] || item.rain['3h'] || 0;
            if (rainAmount > 0) {
                rain = `💧 ${Math.round(rainAmount)}mm`;
            }
        }

        // Sprawdź czy to aktualna godzina
        const isCurrentHour = time.getHours() === currentHour &&
                             time.toDateString() === now.toDateString();

        const hourlyItem = document.createElement('div');
        hourlyItem.className = `hourly-item ${isCurrentHour ? 'current-hour' : ''}`;

        // Format czasu - jeśli to dziś, pokaż tylko godzinę, jeśli jutro/pojutrze, dodaj dzień
        let timeDisplay;
        const today = now.toDateString();
        const itemDate = time.toDateString();

        if (itemDate === today) {
            timeDisplay = time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            if (isCurrentHour) {
                timeDisplay = 'Teraz';
            }
        } else {
            // Inny dzień - pokaż dzień tygodnia + godzinę
            const dayName = time.toLocaleDateString('pl-PL', { weekday: 'short' });
            const timeStr = time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            timeDisplay = `${dayName} ${timeStr}`;
        }

        hourlyItem.innerHTML = `
            <div class="hourly-time">${timeDisplay}</div>
            <div class="hourly-icon">${icon}</div>
            <div class="hourly-temp">${temp}°C</div>
            <div class="hourly-desc">${desc}</div>
            ${rain ? `<div class="hourly-rain">${rain}</div>` : ''}
        `;

        hourlyItems.appendChild(hourlyItem);
    });

    console.log(`✅ Wyświetlono ${itemsToShow.length} pozycji prognozy godzinowej dla ${country}`);
}

function updateDailyForecast(country, data) {
    const dailyItems = document.getElementById(`${country}DailyItems`);
    if (!dailyItems) {
        console.log(`❌ Nie znaleziono elementu ${country}DailyItems`);
        return;
    }

    dailyItems.innerHTML = '';

    // Grupuj dane po dniach
    const dailyData = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: date,
                temps: [],
                weather: item.weather[0],
                rain: 0
            };
        }

        dailyData[dateKey].temps.push(item.main.temp);
        if (item.rain && item.rain['3h']) {
            dailyData[dateKey].rain += item.rain['3h'];
        }
    });

    // Pokaż 3 dni
    const days = Object.values(dailyData).slice(0, 3);
    days.forEach(day => {
        const minTemp = Math.round(Math.min(...day.temps));
        const maxTemp = Math.round(Math.max(...day.temps));
        const icon = WEATHER_ICONS[day.weather.icon] || '⛅';
        const desc = translateWeatherDescription(day.weather.description);
        const rain = day.rain > 0 ? `💧 ${Math.round(day.rain)}mm` : '';

        const dayName = day.date.toLocaleDateString('pl-PL', { weekday: 'short' });
        const dateStr = day.date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

        const dailyItem = document.createElement('div');
        dailyItem.className = 'daily-item';
        dailyItem.innerHTML = `
            <div class="daily-date">
                <div>${dateStr}</div>
                <div class="daily-day">${dayName}</div>
            </div>
            <div class="daily-icon">${icon}</div>
            <div class="daily-desc">${desc}</div>
            <div class="daily-temps">
                <div class="daily-high">${maxTemp}°C</div>
                <div class="daily-low">${minTemp}°C</div>
                ${rain ? `<div class="daily-rain">${rain}</div>` : ''}
            </div>
        `;

        dailyItems.appendChild(dailyItem);
    });
}

// Funkcja czyszcząca wyświetlanie prognozy gdy brak danych
function clearForecastDisplay(country) {
    console.log(`🧹 Czyszczę prognozę dla ${country}`);

    const hourlyItems = document.getElementById(`${country}HourlyItems`);
    const dailyItems = document.getElementById(`${country}DailyItems`);

    if (hourlyItems) {
        hourlyItems.innerHTML = '<div class="no-forecast">Brak danych prognozy godzinowej</div>';
    }

    if (dailyItems) {
        dailyItems.innerHTML = '<div class="no-forecast">Brak danych prognozy 3-dniowej</div>';
    }
}

function checkWeatherAlerts(currentData, forecastData) {
    const alerts = [];
    const weather = currentData.weather[0].main.toLowerCase();
    const temp = currentData.main.temp;
    const windSpeed = currentData.wind.speed * 3.6;

    if (weather.includes('thunderstorm')) {
        alerts.push({
            type: 'storm',
            title: '⚡ Ostrzeżenie o burzy',
            message: 'Aktualnie występuje burza. Unikaj otwartych przestrzeni.'
        });
    }

    if (weather.includes('rain') && currentData.rain && currentData.rain['1h'] > 10) {
        alerts.push({
            type: 'rain',
            title: '🌧️ Intensywny deszcz',
            message: `Silny deszcz: ${Math.round(currentData.rain['1h'])}mm/h. Możliwe podtopienia.`
        });
    }

    if (weather.includes('snow')) {
        alerts.push({
            type: 'snow',
            title: '❄️ Opady śniegu',
            message: 'Opady śniegu mogą utrudniać poruszanie się. Jedź ostrożnie.'
        });
    }

    if (temp < -15) {
        alerts.push({
            type: 'cold',
            title: '🥶 Bardzo niska temperatura',
            message: `Temperatura ${Math.round(temp)}°C. Ryzyko odmrożeń!`
        });
    }

    if (windSpeed > 50) {
        alerts.push({
            type: 'wind',
            title: '💨 Silny wiatr',
            message: `Wiatr ${Math.round(windSpeed)} km/h. Uważaj na spadające obiekty.`
        });
    }

    // Sprawdź nadchodzące burze w prognozie
    if (forecastData && forecastData.list) {
        const upcoming = forecastData.list.slice(0, 4); // Następne 12 godzin

        upcoming.forEach((item, index) => {
            const weather = item.weather[0].main.toLowerCase();
            const time = new Date(item.dt * 1000);
            const timeStr = time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

            if (weather.includes('thunderstorm') && index < 2) {
                alerts.push({
                    type: 'storm',
                    title: '⚡ Nadchodząca burza',
                    message: `Burza przewidywana o ${timeStr}. Przygotuj się!`
                });
            }

            if (weather.includes('rain') && item.rain && item.rain['3h'] > 15 && index < 2) {
                alerts.push({
                    type: 'rain',
                    title: '🌧️ Nadchodzi intensywny deszcz',
                    message: `Silny deszcz przewidywany o ${timeStr}.`
                });
            }
        });
    }

    displayWeatherAlerts(alerts);
}

function displayWeatherAlerts(alerts) {
    const alertsContainer = document.getElementById('weatherAlerts');
    alertsContainer.innerHTML = '';

    alerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = `weather-alert ${alert.type}`;
        alertElement.innerHTML = `
            <div class="alert-title">${alert.title}</div>
            <div class="alert-message">${alert.message}</div>
        `;
        alertsContainer.appendChild(alertElement);
    });

    // Pokaż też systemowe powiadomienie dla pierwszego alertu
    if (alerts.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Ostrzeżenie pogodowe', {
            body: alerts[0].message,
            icon: '/android-chrome-192x192.png'
        });
    }
}

function showWeatherError(country) {
    const prefix = country;
    document.getElementById(`${prefix}Temperature`).textContent = 'Błąd';
    document.getElementById(`${prefix}Description`).textContent = 'Nie można pobrać danych';
    document.getElementById(`${prefix}UpdateTime`).textContent = 'Błąd API';
}

function getCurrentLocation() {
    console.log('📍 getCurrentLocation() wywołana');

    if (!('geolocation' in navigator)) {
        console.log('❌ Geolokalizacja nie jest wspierana');
        alert('❌ Geolokalizacja nie jest wspierana przez tę przeglądarkę.');
        return;
    }

    console.log('🌍 navigator.geolocation dostępne');

    navigator.geolocation.getCurrentPosition(
        async position => {
            console.log('✅ Pozycja pobrana:', position);

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            console.log(`📍 Współrzędne: ${lat}, ${lon}`);

            try {
                // Pobierz nazwę miasta z WeatherAPI
                const url = `${CONFIG.WEATHER_API_URL}/current.json?key=${CONFIG.WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`;
                console.log('🔗 URL reverse geocoding:', url);

                const response = await fetch(url);
                console.log('📡 Response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.log('❌ API Error Response:', errorText);
                    throw new Error(`API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                console.log('✅ Dane lokalizacji:', data);

                const cityName = data.location.name;
                const countryName = data.location.country;
                console.log(`🏙️ Wykryte miasto: ${cityName}, ${countryName}`);

                // Określ czy to Norwegia czy Polska
                let targetCountry = '';
                if (countryName.toLowerCase().includes('norway') || countryName.toLowerCase().includes('norge')) {
                    targetCountry = 'norway';
                } else if (countryName.toLowerCase().includes('poland') || countryName.toLowerCase().includes('polska')) {
                    targetCountry = 'poland';
                } else {
                    // Fallback na podstawie współrzędnych
                    targetCountry = (lat > 58 && lon > 4 && lon < 32) ? 'norway' : 'poland';
                }

                console.log('🌍 Wykryty kraj:', targetCountry);

                // DEBUG - sprawdź elementy HTML
                console.log('🔍 Sprawdzam elementy HTML:');
                console.log('- norwayCity input:', document.getElementById('norwayCity'));
                console.log('- polandCity input:', document.getElementById('polandCity'));
                console.log('- Aktualne weatherSettings przed zmianą:', weatherSettings);

                // Aktualizuj ustawienia
                if (targetCountry === 'norway') {
                    weatherSettings.norwayCity = cityName;
                    console.log('🇳🇴 Aktualizuję miasto Norwegii na:', cityName);

                    // Aktualizuj input jeśli istnieje
                    const input = document.getElementById('norwayCity');
                    if (input) {
                        input.value = cityName;
                        console.log('📝 Zaktualizowano input norwayCity na:', input.value);
                    } else {
                        console.log('❌ Nie znaleziono inputa norwayCity');
                    }
                } else {
                    weatherSettings.polandCity = cityName;
                    console.log('🇵🇱 Aktualizuję miasto Polski na:', cityName);

                    // Aktualizuj input jeśli istnieje
                    const input = document.getElementById('polandCity');
                    if (input) {
                        input.value = cityName;
                        console.log('📝 Zaktualizowano input polandCity na:', input.value);
                    } else {
                        console.log('❌ Nie znaleziono inputa polandCity');
                    }
                }

                console.log('🔍 weatherSettings po zmianie:', weatherSettings);

                // Zapisz ustawienia
                StorageManager.saveWeatherSettings(weatherSettings);
                console.log('💾 Ustawienia zapisane do storage');

                // Sprawdź czy zapisało się poprawnie
                const savedSettings = StorageManager.loadWeatherSettings();
                console.log('🔍 Sprawdzam zapisane ustawienia:', savedSettings);

                // Odśwież pogodę dla zaktualizowanego kraju
                console.log(`🔄 Odświeżam pogodę dla kraju: ${targetCountry}`);
                try {
                    await fetchWeatherData(targetCountry);
                    console.log('✅ Pogoda odświeżona pomyślnie');
                } catch (weatherError) {
                    console.log('❌ Błąd odświeżania pogody:', weatherError);
                }

                alert(`🌍 Lokalizacja zaktualizowana!\n\nMiasto: ${cityName}\nKraj: ${countryName}\nKategoria: ${targetCountry === 'norway' ? 'Norwegia' : 'Polska'}`);

            } catch (error) {
                console.error('❌ Błąd reverse geocoding:', error);
                console.error('❌ Error details:', error.message);
                alert(`📍 Pozycja pobrana (${lat.toFixed(4)}, ${lon.toFixed(4)})\n\nAle wystąpił błąd przy pobieraniu nazwy miasta:\n${error.message}\n\nUżyj ręcznych ustawień miast.`);
            }
        },
        error => {
            console.log('❌ Błąd geolokalizacji:', error);
            console.log('❌ Error code:', error.code);
            console.log('❌ Error message:', error.message);

            let errorMsg = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = 'Brak uprawnień do lokalizacji';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = 'Lokalizacja niedostępna';
                    break;
                case error.TIMEOUT:
                    errorMsg = 'Timeout pobierania lokalizacji';
                    break;
                default:
                    errorMsg = 'Nieznany błąd geolokalizacji';
            }

            alert(`📍 ${errorMsg}. Użyj ręcznych ustawień miast.`);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}
function toggleLocationSettings() {
    const form = document.getElementById('locationForm');
    form.classList.toggle('active');

    if (form.classList.contains('active')) {
        document.getElementById('norwayCity').value = weatherSettings.norwayCity;
        document.getElementById('polandCity').value = weatherSettings.polandCity;
    }
}

function saveLocationSettings() {
    weatherSettings.norwayCity = document.getElementById('norwayCity').value;
    weatherSettings.polandCity = document.getElementById('polandCity').value;

    StorageManager.saveWeatherSettings(weatherSettings);
    toggleLocationSettings();

    // Odśwież pogodę dla nowych miast
    fetchWeatherData('norway');
    fetchWeatherData('poland');

    alert('✅ Ustawienia lokalizacji zapisane!');
}

// Forecast Functions
function showForecast(country, type) {
    // Usuń aktywne klasy z przycisków dla tego kraju
    document.querySelectorAll(`#${country}ForecastTabs .tab-btn`).forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`#${country}ForecastContent .forecast-section`).forEach(section => section.classList.remove('active'));

    // Dodaj aktywne klasy
    event.target.classList.add('active');
    document.getElementById(`${country}${type.charAt(0).toUpperCase() + type.slice(1)}Forecast`).classList.add('active');
}
function startWeatherRefresh() {
    if (weatherRefreshInterval) {
        clearInterval(weatherRefreshInterval);
    }

    weatherRefreshInterval = setInterval(() => {
        fetchWeatherData('norway');
        fetchWeatherData('poland');
    }, CONFIG.WEATHER_REFRESH_INTERVAL);

    console.log('🌤️ Auto-refresh pogody uruchomiony (co 30 minut)');
}

function loadWeatherSettings() {
    const savedSettings = StorageManager.loadWeatherSettings();
    if (savedSettings) {
        weatherSettings = savedSettings;

        // Aktualizuj info o miastach w prognozach
        updateForecastCityInfo('norway', weatherSettings.norwayCity);
        updateForecastCityInfo('poland', weatherSettings.polandCity);
    }
}

// POPRAWIONA funkcja loadSavedWeatherData - bez mock danych
function loadSavedWeatherData() {
    const savedData = StorageManager.loadWeatherData();
    if (savedData && savedData.norway && savedData.poland) {
        const hourAgo = new Date();
        hourAgo.setHours(hourAgo.getHours() - 1);

        if (savedData.norway.lastUpdate && new Date(savedData.norway.lastUpdate) > hourAgo) {
            weatherData = savedData;
            updateWeatherDisplay('norway', savedData.norway.current);
            updateWeatherDisplay('poland', savedData.poland.current);

            // Przywróć prognozy z zapisanych danych TYLKO jeśli istnieją
            if (savedData.norway.forecast && savedData.norway.forecast.list && savedData.norway.forecast.list.length > 0) {
                console.log('🔄 Przywracam prognozę Norwegii z cache...');
                updateForecastDisplay('norway', savedData.norway.forecast);
            } else {
                clearForecastDisplay('norway');
            }

            if (savedData.poland.forecast && savedData.poland.forecast.list && savedData.poland.forecast.list.length > 0) {
                console.log('🔄 Przywracam prognozę Polski z cache...');
                updateForecastDisplay('poland', savedData.poland.forecast);
            } else {
                clearForecastDisplay('poland');
            }

            console.log('✅ Załadowano zapisane dane pogody');
            return;
        }
    }

    // Brak świeżych danych - pobierz nowe
    console.log('🔄 Pobieranie świeżych danych pogody...');
    fetchWeatherData('norway');
    fetchWeatherData('poland');
}
// Menu functions
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
}

function updateForecastCityInfo(country, cityName) {
    const cityInfoElement = document.getElementById(`${country}ForecastCity`);
    if (cityInfoElement && cityName) {
        const flag = country === 'norway' ? '🇳🇴' : '🇵🇱';
        cityInfoElement.textContent = `📍 ${cityName}`;
        console.log(`📍 Zaktualizowano info miasta dla ${country}: ${cityName}`);
    }
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
        loadSavedExchangeRate();
        startCurrencyRefresh();
    } else if (pageName === 'weather') {
        loadWeatherSettings();
        loadSavedWeatherData();
        startWeatherRefresh();

        updateForecastCityInfo('norway', weatherSettings.norwayCity);
            updateForecastCityInfo('poland', weatherSettings.polandCity);
    }
}


// Calendar functions (zachowane z poprzedniej wersji)
function calculateRotationsFromDate(lastDeparture) {
    rotationData = [];
    let currentWorkStart = new Date(lastDeparture);
    currentWorkStart.setHours(0, 0, 0, 0);

    console.log("🚀 Rozpoczynam obliczenia rotacji od:", currentWorkStart.toLocaleDateString());

    for (let i = 0; i < 12; i++) {
        const workStart = new Date(currentWorkStart);
        const workEnd = new Date(currentWorkStart);
        workEnd.setDate(workEnd.getDate() + 14);

        rotationData.push({
            start: new Date(workStart),
            end: new Date(workEnd),
            type: 'work'
        });

        console.log(`✈️ Rotacja ${i + 1} - Praca: ${workStart.toLocaleDateString()} - ${workEnd.toLocaleDateString()}`);

        const restStart = new Date(workEnd);
        restStart.setDate(restStart.getDate() + 1);

        const restEnd = new Date(restStart);
        restEnd.setDate(restEnd.getDate() + 19);

        rotationData.push({
            start: new Date(restStart),
            end: new Date(restEnd),
            type: 'rest'
        });

        console.log(`🏠 Rotacja ${i + 1} - Odpoczynek: ${restStart.toLocaleDateString()} - ${restEnd.toLocaleDateString()}`);

        currentWorkStart = new Date(restEnd);
        currentWorkStart.setDate(currentWorkStart.getDate() + 1);
    }

    console.log(`✅ Wygenerowano łącznie ${rotationData.length} rotacji`);
}

function updateStatusCards() {
    console.log('🔄 Aktualizuję karty statusu...');

    // Sprawdź czy elementy istnieją
    const currentDaysElement = document.getElementById('currentDays');
    const currentLabelElement = document.getElementById('currentLabel');
    const currentStatusElement = document.getElementById('currentStatus');
    const nextDaysElement = document.getElementById('nextDays');
    const nextLabelElement = document.getElementById('nextLabel');
    const nextStatusElement = document.getElementById('nextStatus');

    if (!currentDaysElement || !nextDaysElement) {
        console.log('❌ Nie znaleziono elementów statusu!');
        return;
    }

    if (!rotationData || rotationData.length === 0) {
        console.log('❌ Brak danych rotacji - ustawiam wartości domyślne');
        currentDaysElement.textContent = '--';
        currentLabelElement.textContent = 'Dni do powrotu';
        currentStatusElement.className = 'status-card work';

        nextDaysElement.textContent = '--';
        nextLabelElement.textContent = 'Dni do wylotu';
        nextStatusElement.className = 'status-card rest';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('📅 Dzisiejsza data (00:00):', today.toLocaleDateString());
    console.log('🔍 Szukam aktualnej rotacji...');

    // Znajdź aktualną rotację
    let currentRotation = null;
    for (let i = 0; i < rotationData.length; i++) {
        const rotation = rotationData[i];
        const rotationStart = new Date(rotation.start);
        const rotationEnd = new Date(rotation.end);

        // Ustaw godziny na 00:00 dla dokładnego porównania
        rotationStart.setHours(0, 0, 0, 0);
        rotationEnd.setHours(0, 0, 0, 0);

        console.log(`📋 Rotacja ${i + 1}: ${rotationStart.toLocaleDateString()} - ${rotationEnd.toLocaleDateString()} (${rotation.type})`);

        if (today >= rotationStart && today <= rotationEnd) {
            currentRotation = rotation;
            console.log(`✅ Znaleziono aktualną rotację: ${rotation.type}`);
            break;
        }
    }

    if (currentRotation) {
        const rotationEnd = new Date(currentRotation.end);
        rotationEnd.setHours(0, 0, 0, 0);

        const daysLeft = Math.ceil((rotationEnd - today) / (1000 * 60 * 60 * 24)) + 1;
        console.log(`📊 Dni pozostałe w aktualnej rotacji: ${daysLeft}`);

        if (currentRotation.type === 'work') {
            // Aktualnie w pracy - pokaż dni do powrotu
            currentDaysElement.textContent = daysLeft;
            currentLabelElement.textContent = 'Dni do powrotu';
            currentStatusElement.className = 'status-card work';

            // Znajdź następną rotację (odpoczynek)
            const nextRestRotation = rotationData.find(rotation => {
                const rotationStart = new Date(rotation.start);
                rotationStart.setHours(0, 0, 0, 0);
                return rotation.type === 'rest' && rotationStart > today;
            });

            if (nextRestRotation) {
                const nextStart = new Date(nextRestRotation.start);
                nextStart.setHours(0, 0, 0, 0);
                const daysUntilRest = Math.ceil((nextStart - today) / (1000 * 60 * 60 * 24));

                nextDaysElement.textContent = daysUntilRest;
                nextLabelElement.textContent = 'Dni do odpoczynku';
                nextStatusElement.className = 'status-card rest';

                console.log(`📊 Dni do następnego odpoczynku: ${daysUntilRest}`);
            } else {
                nextDaysElement.textContent = '--';
                nextLabelElement.textContent = 'Dni do odpoczynku';
                nextStatusElement.className = 'status-card rest';
            }

        } else {
            // Aktualnie w odpoczynku - pokaż dni do wylotu
            nextDaysElement.textContent = daysLeft;
            nextLabelElement.textContent = 'Dni do wylotu';
            nextStatusElement.className = 'status-card rest';

            // Znajdź następną rotację (praca)
            const nextWorkRotation = rotationData.find(rotation => {
                const rotationStart = new Date(rotation.start);
                rotationStart.setHours(0, 0, 0, 0);
                return rotation.type === 'work' && rotationStart > today;
            });

            if (nextWorkRotation) {
                const nextStart = new Date(nextWorkRotation.start);
                nextStart.setHours(0, 0, 0, 0);
                const daysUntilWork = Math.ceil((nextStart - today) / (1000 * 60 * 60 * 24));

                currentDaysElement.textContent = daysUntilWork;
                currentLabelElement.textContent = 'Dni do wylotu';
                currentStatusElement.className = 'status-card work';

                console.log(`📊 Dni do następnej pracy: ${daysUntilWork}`);
            } else {
                currentDaysElement.textContent = '--';
                currentLabelElement.textContent = 'Dni do wylotu';
                currentStatusElement.className = 'status-card work';
            }
        }

    } else {
        console.log('❌ Nie znaleziono aktualnej rotacji');

        // Znajdź najbliższą przyszłą rotację
        let nextRotation = null;
        let minDays = Infinity;

        for (let i = 0; i < rotationData.length; i++) {
            const rotation = rotationData[i];
            const rotationStart = new Date(rotation.start);
            rotationStart.setHours(0, 0, 0, 0);

            if (rotationStart > today) {
                const daysUntil = Math.ceil((rotationStart - today) / (1000 * 60 * 60 * 24));
                if (daysUntil < minDays) {
                    minDays = daysUntil;
                    nextRotation = rotation;
                }
            }
        }

        if (nextRotation) {
            console.log(`📅 Najbliższa rotacja: ${nextRotation.type} za ${minDays} dni`);

            if (nextRotation.type === 'work') {
                currentDaysElement.textContent = minDays;
                currentLabelElement.textContent = 'Dni do wylotu';
                currentStatusElement.className = 'status-card work';

                nextDaysElement.textContent = '--';
                nextLabelElement.textContent = 'Dni do powrotu';
                nextStatusElement.className = 'status-card rest';
            } else {
                currentDaysElement.textContent = '--';
                currentLabelElement.textContent = 'Dni do powrotu';
                currentStatusElement.className = 'status-card work';

                nextDaysElement.textContent = minDays;
                nextLabelElement.textContent = 'Dni do odpoczynku';
                nextStatusElement.className = 'status-card rest';
            }
        } else {
            // Brak przyszłych rotacji
            currentDaysElement.textContent = '--';
            currentLabelElement.textContent = 'Dni do powrotu';
            currentStatusElement.className = 'status-card work';

            nextDaysElement.textContent = '--';
            nextLabelElement.textContent = 'Dni do wylotu';
            nextStatusElement.className = 'status-card rest';
        }
    }

     console.log('✅ Karty statusu zaktualizowane!');
        console.log('- Current:', currentDaysElement.textContent, currentLabelElement.textContent);
        console.log('- Next:', nextDaysElement.textContent, nextLabelElement.textContent);

        // DODAJ TE LINIE:
        // Aktualizuj widget po zmianie statusu
        setTimeout(() => {
            updateWidget();
        }, 100); // Krótkie opóźnienie żeby DOM się zaktualizował
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

    console.log('🔄 Obliczam rotacje...');

    StorageManager.saveRotationData(lastDeparture, rotationData);
    calculateRotationsFromDate(lastDeparture);

    document.getElementById('setupSection').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');

    console.log('🔄 Aktualizuję interfejs...');
        updateStatusCards();
        generateCalendar();
        generateUpcomingEvents();

        console.log('✅ Rotacje obliczone i interfejs zaktualizowany');

        // DODAJ:
        updateWidget();

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
        updateWidget();
        return true;
    } else {
        document.getElementById('setupSection').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        return false;
    }
}

function updateWidget() {
    console.log('🔄 Aktualizuję widget...');

    // Sprawdź czy Android interface jest dostępny
    if (typeof AndroidWidget === 'undefined') {
        console.log('❌ AndroidWidget nie jest dostępny - prawdopodobnie przeglądarka');
        return;
    }

    // Pobierz aktualne dane z kart statusu
    const currentDaysElement = document.getElementById('currentDays');
    const currentLabelElement = document.getElementById('currentLabel');
    const nextDaysElement = document.getElementById('nextDays');
    const nextLabelElement = document.getElementById('nextLabel');

    if (!currentDaysElement || !nextDaysElement) {
        console.log('❌ Nie znaleziono elementów kart statusu');
        return;
    }

    const widgetData = {
        currentDays: currentDaysElement.textContent || '--',
        currentLabel: currentLabelElement.textContent || 'dni do powrotu',
        nextDays: nextDaysElement.textContent || '--',
        nextLabel: nextLabelElement.textContent || 'dni do wylotu',
        lastUpdate: new Date().toISOString()
    };

    console.log('📊 Wysyłam dane do widgetu:', widgetData);

    try {
        AndroidWidget.updateWidgetData(JSON.stringify(widgetData));
        console.log('✅ Dane widgetu wysłane pomyślnie');
    } catch (error) {
        console.error('❌ Błąd wysyłania danych do widgetu:', error);
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

// Earnings functions (zachowane)
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
    updateTotalEarningsPLN();
    displayEarnings();
    toggleEarningsForm();
}

function loadEarnings() {
    earnings = StorageManager.loadEarnings();
    updateTotalEarnings();
    updateTotalEarningsPLN();
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

        const plnAmount = currentExchangeRate ? (earning.amount * currentExchangeRate.rate) : 0;
        const plnDisplay = currentExchangeRate ?
            `<div class="earning-amount-pln">≈ ${plnAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</div>` : '';

        earningItem.innerHTML = `
            <div class="earning-info">
                <div class="earning-amount">${earning.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NOK</div>
                ${plnDisplay}
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
            updateTotalEarningsPLN();
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

// Flights functions (zachowane)
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

    // Sprawdź uprawnienia do powiadomień
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    if (weatherRefreshInterval) {
        clearInterval(weatherRefreshInterval);
    }
});


// === BEZPIECZNY DEBUG TEST ===
// Dodaj to NA KONIEC pliku main.js (nie zamieniaj niczego!)

// Test funkcja - nie wpływa na resztę kodu
window.safeDebugWeatherAPI = function() {
    console.log('🧪 === SAFE DEBUG TEST ===');

    // Sprawdź czy CONFIG istnieje
    if (typeof CONFIG === 'undefined') {
        console.log('❌ CONFIG nie jest zdefiniowany!');
        return;
    }

    console.log('✅ CONFIG istnieje:', CONFIG);
    console.log('🔑 API Key:', CONFIG.WEATHER_API_KEY);
    console.log('🌐 API URL:', CONFIG.WEATHER_API_URL);

    // Zbuduj test URL
    const testUrl = `${CONFIG.WEATHER_API_URL}/current.json?key=${CONFIG.WEATHER_API_KEY}&q=Oslo&aqi=no`;
    console.log('🔗 Test URL:', testUrl);

    // Prosty test fetch
    console.log('📡 Testuję API...');
    fetch(testUrl)
        .then(response => {
            console.log('📨 Response status:', response.status);
            console.log('📨 Response ok:', response.ok);
            console.log('📨 Response statusText:', response.statusText);

            // Pokaż headers
            const headers = {};
            for (let [key, value] of response.headers.entries()) {
                headers[key] = value;
            }
            console.log('📨 Response headers:', headers);

            return response.text();
        })
        .then(text => {
            console.log('📨 Response body (text):', text);

            // Spróbuj sparsować JSON
            try {
                const json = JSON.parse(text);
                console.log('✅ Response body (JSON):', json);
            } catch (e) {
                console.log('❌ Response nie jest prawidłowym JSON');
            }
        })
        .catch(error => {
            console.log('❌ Fetch error:', error);
            console.log('❌ Error type:', typeof error);
            console.log('❌ Error name:', error.name);
            console.log('❌ Error message:', error.message);
        });
};

// Auto-test za 5 sekund (żeby strona się załadowała)
setTimeout(function() {
    console.log('🚀 Uruchamiam safe debug test...');
    try {
        safeDebugWeatherAPI();
    } catch (error) {
        console.log('❌ Błąd w debug test:', error);
    }
}, 5000);

// POPRAWIONE FUNKCJE USTAWIEŃ LOKALIZACJI - dodaj do main.js

function toggleLocationSettings() {
    const form = document.getElementById('locationForm');
    const isActive = form.classList.contains('active');

    console.log('⚙️ toggleLocationSettings - obecny stan:', isActive);

    if (isActive) {
        // Zamykanie formularza
        form.classList.remove('active');
        console.log('📝 Zamykam formularz ustawień');
    } else {
        // Otwieranie formularza - załaduj aktualne wartości
        form.classList.add('active');
        console.log('📝 Otwieram formularz ustawień');

        // Załaduj aktualne ustawienia do pól
        const norwayInput = document.getElementById('norwayCity');
        const polandInput = document.getElementById('polandCity');

        if (norwayInput && weatherSettings.norwayCity) {
            norwayInput.value = weatherSettings.norwayCity;
            console.log('🇳🇴 Załadowano miasto Norwegii:', weatherSettings.norwayCity);
        }

        if (polandInput && weatherSettings.polandCity) {
            polandInput.value = weatherSettings.polandCity;
            console.log('🇵🇱 Załadowano miasto Polski:', weatherSettings.polandCity);
        }
    }
}

function saveLocationSettings() {
    console.log('💾 saveLocationSettings() wywołana');

    const norwayInput = document.getElementById('norwayCity');
    const polandInput = document.getElementById('polandCity');

    if (!norwayInput || !polandInput) {
        console.error('❌ Nie znaleziono pól input!');
        alert('❌ Błąd: Nie można znaleźć pól ustawień');
        return;
    }

    const norwayCity = norwayInput.value.trim();
    const polandCity = polandInput.value.trim();

    console.log('📝 Nowe wartości:');
    console.log('- Norwegia:', norwayCity);
    console.log('- Polska:', polandCity);

    if (!norwayCity || !polandCity) {
        alert('❌ Proszę wypełnić oba pola miast');
        return;
    }


    // Zapisz do weatherSettings
    const oldSettings = { ...weatherSettings };
        weatherSettings.norwayCity = norwayCity;
        weatherSettings.polandCity = polandCity;

        console.log('🔄 Aktualizuję weatherSettings:');
        console.log('- Stare:', oldSettings);
        console.log('- Nowe:', weatherSettings);

    // Zapisz do storage
        try {
            StorageManager.saveWeatherSettings(weatherSettings);
            console.log('💾 Ustawienia zapisane do storage');

            // Sprawdź czy zapisało się
            const savedSettings = StorageManager.loadWeatherSettings();
            console.log('🔍 Sprawdzam zapisane ustawienia:', savedSettings);

        } catch (error) {
            console.error('❌ Błąd zapisu ustawień:', error);
            alert('❌ Błąd zapisu ustawień: ' + error.message);
            return;
        }

// Aktualizuj informacje o miastach w prognozach
    updateForecastCityInfo('norway', norwayCity);
    updateForecastCityInfo('poland', polandCity);

    // Zamknij formularz
    toggleLocationSettings();

     // Sprawdź czy miasta się zmieniły i odśwież pogodę
        if (oldSettings.norwayCity !== norwayCity) {
            console.log('🔄 Miasto Norwegii się zmieniło - odświeżam pogodę');
            fetchWeatherData('norway');
        }

        if (oldSettings.polandCity !== polandCity) {
            console.log('🔄 Miasto Polski się zmieniło - odświeżam pogodę');
            fetchWeatherData('poland');
        }

        alert(`✅ Ustawienia zapisane!\n\nNorwegia: ${norwayCity}\nPolska: ${polandCity}`);

        console.log('✅ saveLocationSettings() zakończona pomyślnie');
    }


// Funkcja pomocnicza - sprawdź czy wszystko jest OK
function debugLocationSettings() {
    console.log('🔍 === DEBUG USTAWIEŃ LOKALIZACJI ===');
    console.log('weatherSettings:', weatherSettings);
    console.log('norwayCity input:', document.getElementById('norwayCity'));
    console.log('polandCity input:', document.getElementById('polandCity'));
    console.log('locationForm:', document.getElementById('locationForm'));

    const norwayInput = document.getElementById('norwayCity');
    const polandInput = document.getElementById('polandCity');

    if (norwayInput) {
        console.log('norwayCity value:', norwayInput.value);
        console.log('norwayCity type:', norwayInput.type);
    }

    if (polandInput) {
        console.log('polandCity value:', polandInput.value);
        console.log('polandCity type:', polandInput.type);
    }

    // Test kliknięcia
    console.log('🧪 Testuję funkcje:');
    console.log('- toggleLocationSettings:', typeof toggleLocationSettings);
    console.log('- saveLocationSettings:', typeof saveLocationSettings);
}

// Auto-debug za 3 sekundy
setTimeout(function() {
    console.log('🔄 Auto-debug ustawień lokalizacji...');
    debugLocationSettings();
}, 3000);

setInterval(() => {
    console.log('🕐 Auto-aktualizacja widgetu...');
    updateWidget();
}, 60 * 60 * 1000); // co godzinę

// Aktualizuj widget przy załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    loadEarnings();
    loadFlights();

    const lastDepartureElement = document.getElementById('lastDeparture');
    if (lastDepartureElement) {
        lastDepartureElement.valueAsDate = new Date();
    }

    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // DODAJ:
    // Zaktualizuj widget po 2 sekundach (żeby wszystko się załadowało)
    setTimeout(() => {
        updateWidget();
    }, 2000);
});
