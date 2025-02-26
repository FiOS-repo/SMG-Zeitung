import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import basicAuth from 'express-basic-auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Add basic authentication middleware
const auth = basicAuth({
    users: { 
        [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD 
    },
    challenge: true,
    realm: 'Admin Interface',
});

// Apply auth middleware to all routes
app.use(auth);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
})

app.listen(3000, () => {
    console.log("Server started on http://localhost:3000");
});