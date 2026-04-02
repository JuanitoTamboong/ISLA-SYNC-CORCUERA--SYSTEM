
const CORCUERA_COORDS = {
    lat: 12.8055,
    lon: 122.0474
};

// OpenWeatherMap API configuration
const WEATHER_API_KEY = '6b69efb907075e33f198db87ebacca96';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

class WeatherService {
    constructor() {
        this.currentWeather = null;
        // Map OpenWeatherMap weather conditions to icons
        this.weatherIconMap = {
            '01d': 'fa-sun',
            '01n': 'fa-moon',
            '02d': 'fa-cloud-sun',
            '02n': 'fa-cloud-moon',
            '03d': 'fa-cloud',
            '03n': 'fa-cloud',
            '04d': 'fa-cloud',
            '04n': 'fa-cloud',
            '09d': 'fa-cloud-rain',
            '09n': 'fa-cloud-rain',
            '10d': 'fa-cloud-rain',
            '10n': 'fa-cloud-rain',
            '11d': 'fa-bolt',
            '11n': 'fa-bolt',
            '13d': 'fa-snowflake',
            '13n': 'fa-snowflake',
            '50d': 'fa-smog',
            '50n': 'fa-smog'
        };
    }

    async fetchWeather() {
        try {
            console.log('Fetching weather data from OpenWeatherMap for Corcuera, Romblon...');
            
            const url = `${WEATHER_API_URL}?lat=${CORCUERA_COORDS.lat}&lon=${CORCUERA_COORDS.lon}&units=metric&appid=${WEATHER_API_KEY}`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Weather data received:', data);
                this.currentWeather = this.parseWeatherData(data);
                this.saveToLocalStorage();
                return this.currentWeather;
            } else {
                console.error('Weather API error:', response.status);
                return this.getFallbackWeather();
            }
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return this.getFallbackWeather();
        }
    }

    parseWeatherData(data) {
        const weatherMain = data.weather[0].main;
        const weatherDescription = data.weather[0].description;
        const iconCode = data.weather[0].icon;
        const temp = Math.round(data.main.temp);
        
        // Philippine-specific condition formatting
        let condition = weatherDescription.charAt(0).toUpperCase() + weatherDescription.slice(1);
        
        if (temp >= 32 && weatherMain === 'Clear') {
            condition = 'Very Hot! 🔥 ' + condition;
        } else if (temp >= 30 && weatherMain === 'Clear') {
            condition = 'Hot & Sunny 🌞';
        } else if (temp >= 28 && weatherMain === 'Clouds') {
            condition = 'Warm & Cloudy ☁️';
        } else if (weatherMain === 'Rain') {
            condition = 'Rainy Day 🌧️ ' + condition;
        } else if (weatherMain === 'Thunderstorm') {
            condition = 'Thunderstorm ⚡ ' + condition;
        }
        
        return {
            temperature: temp,
            condition: condition,
            location: 'Corcuera, Romblon',
            icon: this.getWeatherIcon(iconCode),
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6),
            feelsLike: Math.round(data.main.feels_like),
            lastUpdated: new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })
        };
    }

    getWeatherIcon(iconCode) {
        return this.weatherIconMap[iconCode] || 'fa-cloud-sun';
    }

    getFallbackWeather() {
        const cachedWeather = localStorage.getItem('cachedWeather');
        if (cachedWeather) {
            try {
                const parsed = JSON.parse(cachedWeather);
                const now = Date.now();
                if (now - parsed.timestamp < 3600000) {
                    return parsed.data;
                }
            } catch (e) {}
        }
        
        return {
            temperature: 31,
            condition: 'Hot & Sunny 🌞',
            location: 'Corcuera, Romblon',
            icon: 'fa-sun',
            humidity: 72,
            windSpeed: 12,
            feelsLike: 36,
            lastUpdated: 'Recently'
        };
    }

    saveToLocalStorage() {
        if (this.currentWeather) {
            localStorage.setItem('cachedWeather', JSON.stringify({
                data: this.currentWeather,
                timestamp: Date.now()
            }));
        }
    }

    async updateWeatherUI() {
        const weatherContainer = document.querySelector('.weather');
        if (weatherContainer && !weatherContainer.classList.contains('loading')) {
            weatherContainer.classList.add('loading');
        }
        
        try {
            const weatherData = await this.fetchWeather();
            
            const tempElement = document.querySelector('.weather h1');
            const locationElement = document.querySelector('.weather-center p');
            const conditionElement = document.querySelector('.weather-center span');
            const iconElement = document.querySelector('.weather i');
            
            if (tempElement) tempElement.textContent = `${weatherData.temperature}°C`;
            if (locationElement) locationElement.textContent = weatherData.location;
            if (conditionElement) conditionElement.textContent = weatherData.condition;
            
            if (iconElement) {
                iconElement.className = '';
                iconElement.classList.add('fas', weatherData.icon);
            }
            
            this.addDetailedWeatherInfo(weatherData);
            
        } catch (error) {
            console.error('Error updating weather UI:', error);
        } finally {
            if (weatherContainer) {
                weatherContainer.classList.remove('loading');
            }
        }
    }
    
    addDetailedWeatherInfo(weatherData) {
        let detailsElement = document.querySelector('.weather-details');
        
        if (!detailsElement) {
            detailsElement = document.createElement('div');
            detailsElement.className = 'weather-details';
            const weatherContainer = document.querySelector('.weather');
            if (weatherContainer) {
                weatherContainer.appendChild(detailsElement);
            }
        }
        
        if (detailsElement) {
            detailsElement.innerHTML = `
                <div class="weather-detail-item">
                    <i class="fas fa-tint"></i>
                    <span>${weatherData.humidity}%</span>
                    <small>Humidity</small>
                </div>
                <div class="weather-detail-item">
                    <i class="fas fa-temperature-high"></i>
                    <span>${weatherData.feelsLike}°C</span>
                    <small>Feels like</small>
                </div>
                <div class="weather-detail-item">
                    <i class="fas fa-wind"></i>
                    <span>${weatherData.windSpeed} km/h</span>
                    <small>Wind</small>
                </div>
            `;
        }
    }
    
    startAutoRefresh() {
        setInterval(async () => {
            await this.updateWeatherUI();
        }, 900000);
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateWeatherUI();
            }
        });
    }
}

// Initialize weather service
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const weatherService = new WeatherService();
        weatherService.updateWeatherUI().then(() => {
            weatherService.startAutoRefresh();
        });
        window.weatherService = weatherService;
    });
} else {
    const weatherService = new WeatherService();
    weatherService.updateWeatherUI().then(() => {
        weatherService.startAutoRefresh();
    });
    window.weatherService = weatherService;
}