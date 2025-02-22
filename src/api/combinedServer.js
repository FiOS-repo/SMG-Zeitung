import express from 'express';
import fs from 'fs';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { schedule } from 'node-cron';

config();
const app = express();
app.use(express.json());

// Star rating API
app.get("/api/star", (req, res) => {
    let stars = req.query.stars;
    let article = req.query.article;

    if (!stars && article) {
        res.send(`Hmm. Kann es sein, dass du uns hacken willst`);
    } else if (stars > 5) {
        res.send("Hmm. Kann es sein, dass du uns hacken willst");
    } else {
        fs.appendFile('stars.csv', `${stars},${article} \n`, function (err) {
            if (err) throw err;
            console.log('Saved!');
        });
        res.send("Saved");
    }
});

app.get("/api/poll/", (_, res) => {
    fs.readFile("polls.json", "utf8", function(err, data) {
        if (err) {
            res.sendStatus(500).send("Error reading polls.json");
            return;
        }
        let json = JSON.parse(data);
        let length = json.length;
        let index = Math.floor(Math.random() * length);
        res.send(json[index]);
    });
});

app.get("/api/poll/answer", (req, res) => {
    let id = req.query.id;
    let answer = req.query.answer;

    if (!id || !answer) {
        res.sendStatus(400).send("Fehlende id oder answer Parameter");
        return;
    }

    fs.appendFile("polls.csv", `${id},${answer}\n`, function(err) {
        if (err) {
            res.sendStatus(500).send("Error writing answer");
            return;
        }
        res.send("Answer saved");
    });
});

app.get("/api/star/stats", (req, res) => {
    fs.readFile('stars.csv', 'utf8', function (err, data) {
        if (err) throw err;

        let lines = data.trim().split('\n');
        let articleStats = {};

        lines.forEach(line => {
            let [stars, article] = line.split(',').map(item => item.trim());
            stars = parseInt(stars);

            if (!articleStats[article]) {
                articleStats[article] = { totalStars: 0, count: 0 };
            }

            articleStats[article].totalStars += stars;
            articleStats[article].count += 1;
        });

        let stats = {};
        for (let article in articleStats) {
            let totalStars = articleStats[article].totalStars;
            let count = articleStats[article].count;
            stats[article] = {
                totalStars: totalStars,
                averageRating: (totalStars / count).toFixed(2)
            };
        }

        res.send(stats);
    });
});

// Weather API
let weatherData = null;
const weatherImages = {
    "clear sky": "/src/assets/WeatherIcons/sun.svg",
    "few clouds": "/src/assets/WeatherIcons/few clouds.svg",
    "scattered clouds": "/src/assets/WeatherIcons/scattered clouds.svg",
    "broken clouds": "/src/assets/WeatherIcons/broken clouds.svg",
    "shower rain": "/src/assets/WeatherIcons/rain.svg",
    "rain": "/src/assets/WeatherIcons/rain.svg",
    "thunderstorm": "/src/assets/WeatherIcons/thunderstorm.svg",
    "snow": "/src/assets/WeatherIcons/snow.svg",
    "mist": "/src/assets/WeatherIcons/few clouds.svg",
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
