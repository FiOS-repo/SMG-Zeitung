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

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
