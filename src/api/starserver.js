import express from 'express';
import fs from 'fs';

const app = express();

app.get("/api/star", (req, res) => {
    let stars = req.query.stars
    let article = req.query.article

    if (!stars && article) {
        res.send(`Hmm. Kann es sein, dass du uns hacken willst`);
    } else if (stars > 5) {
        res.send("Hmm. Kann es sein, dass du uns hacken willst");
    } 
    else {
        fs.appendFile('stars.csv', `${stars},${article} \n`, function (err) {
            if (err) throw err;
            console.log('Saved!');
        }); 
        res.send("Saved");
    }
});

app.get("/api/star/stats", (req, res) => {
    fs.readFile('stars.csv', 'utf8', function(err, data) {
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

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
