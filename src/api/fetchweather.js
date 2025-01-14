import {config} from 'dotenv';
config();

import express from 'express';
import fetch from 'node-fetch';
import {schedule} from 'node-cron';

const app = express();
app.use(express.json());

let weatherData = null;
// TODO: Fix Icon URLs
const weatherImages = {
    "clear sky": "/src/assets/WeatherIcons/sun.svg",
    "few clouds": "/src/assets/WeatherIcons/few clouds.svg",
    "scattered clouds": "/src/assets/WeatherIcons/scattered clouds.svg",
    "broken clouds": "/src/assets/WeatherIcons/broken clouds.svg",
    "shower rain": "/src/assets/WeatherIcons/rain.svg",
    "rain": "/src/assets/WeatherIcons/rain.svg",
    "thunderstorm": "/src/assets/WeatherIcons/thunderstorm.svg",
    "snow": "/src/assets/WeatherIcons/snow.svg",
    "mist": "/src/assets/WeatherIcons/mist.svg",
    "overcast clouds": "/src/assets/WeatherIcons/broken clouds.svg",
    "light intensity drizzle": "/src/assets/WeatherIcons/rain.svg",
    "moderate rain": "/src/assets/WeatherIcons/rain.svg"
};

const fetchWeatherData = async () => {
    const longitude = "6.659837";
    const latitude = "51.283920";
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
        console.error('Error: OPENWEATHER_API_KEY is not defined in environment variables.');
        return;
    }

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch weather data. Status: ${response.status}`);
        }
        const data = await response.json();
        const description = data.weather[0].description;
        const temperature = data.main.temp.toFixed(1);
        const iconurl = weatherImages[description] || "/src/assets/WeatherIcons/default.svg";
        weatherData = { temperature, description, iconurl };
        console.log('Weather data updated:', weatherData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
};

// Schedule the fetch operation to run every minute
schedule('* * * * *', fetchWeatherData);

fetchWeatherData();

app.get('/weather', (req, res) => {
    if (weatherData) {
        res.json(weatherData);
    } else {
        res.status(503).json({ error: 'Weather data not available' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;