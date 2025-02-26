import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { schedule } from 'node-cron';
import cors from 'cors';

config();
const app = express();
app.use(express.json());
app.use(cors());

// Define absolute file paths
const API_DIR = path.resolve('./');
const STARS_FILE = path.join(API_DIR, 'stars.csv');
const POLLS_JSON = path.join(API_DIR, 'polls.json');
const POLLS_CSV = path.join(API_DIR, 'polls.csv');
const COMMENTS_FILE = path.join(API_DIR, 'pending_comments.json');

// Ensure files exist
const ensureFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        const defaultContent = filePath.endsWith('.json') ? '[]' : '';
        fs.writeFileSync(filePath, defaultContent, 'utf8');
    }
};

// Initialize files
[STARS_FILE, POLLS_JSON, POLLS_CSV, COMMENTS_FILE].forEach(ensureFile);

// Star rating API
app.get("/api/star", (req, res) => {
    const stars = parseInt(req.query.stars);
    const article = req.query.article;

    if (!article || typeof article !== 'string') {
        return res.status(400).send("Invalid article parameter");
    }
    if (!stars || isNaN(stars) || stars < 1 || stars > 5) {
        return res.status(400).send("Stars must be between 1 and 5");
    }

    fs.appendFile(STARS_FILE, `${stars},${article}\n`, err => {
        if (err) {
            console.error('Error saving star rating:', err);
            return res.status(500).send("Error saving rating");
        }
        res.send("Saved");
    });
});

app.get("/api/poll/", (_, res) => {
    fs.readFile(POLLS_JSON, "utf8", function (err, data) {
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

app.get("/api/poll/results", (req, res) => {
    let id = req.query.id;

    if (!id) {
        res.sendStatus(400).send("Fehlende id Parameter");
        return;
    }

    fs.readFile(POLLS_CSV, "utf8", function (err, data) {
        if (err) {
            res.sendStatus(500).send("Error reading polls.csv");
            return;
        }

        let lines = data.trim().split('\n');
        let answers = lines
            .map(line => line.split(','))
            .filter(([pollId, _]) => pollId === id)
            .map(([_, answer]) => answer);

        res.send(answers);
    });
});

app.get("/api/poll/answer", (req, res) => {
    let id = req.query.id;
    let answer = req.query.answer;

    if (!id || !answer) {
        res.sendStatus(400).send("Fehlende id oder answer Parameter");
        return;
    }

    fs.appendFile(POLLS_CSV, `${id},${answer}\n`, function (err) {
        if (err) {
            res.sendStatus(500).send("Error writing answer");
            return;
        }
        res.send("Answer saved");
    });
});

app.get("/api/star/stats", (req, res) => {
    fs.readFile(STARS_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json({});
            }
            console.error('Error reading star stats:', err);
            return res.status(500).send("Error reading stats");
        }

        try {
            let lines = data.trim().split('\n');
            let articleStats = {};

            lines.forEach(line => {
                if (!line) return;
                let [stars, article] = line.split(',').map(item => item.trim());
                stars = parseInt(stars);

                if (!articleStats[article]) {
                    articleStats[article] = { totalStars: 0, count: 0 };
                }

                articleStats[article].totalStars += stars;
                articleStats[article].count += 1;
            });

            let stats = Object.entries(articleStats).reduce((acc, [article, data]) => {
                acc[article] = {
                    totalStars: data.totalStars,
                    count: data.count,
                    averageRating: (data.totalStars / data.count).toFixed(1)
                };
                return acc;
            }, {});

            res.json(stats);
        } catch (error) {
            console.error('Error processing star stats:', error);
            res.status(500).send("Error processing stats");
        }
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

app.get('/api/comment', (req, res) => {
    fs.readFile(COMMENTS_FILE, 'utf8', (err, data) => {
        res.send(data)
    });
});


app.get('/api/comment/send', (req, res) => {
    const { comment, name, article } = req.query;

    if (!comment || !name || !article || 
        typeof comment !== 'string' || 
        typeof name !== 'string' || 
        typeof article !== 'string') {
        return res.status(400).send("Invalid parameters");
    }

    try {
        let comments = [];
        if (fs.existsSync(COMMENTS_FILE)) {
            const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
            comments = JSON.parse(data);
        }

        comments.push({ 
            name, 
            comment, 
            article,
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
        res.send("Comment saved");
    } catch (error) {
        console.error('Error handling comment:', error);
        res.status(500).send("Error processing comment");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
