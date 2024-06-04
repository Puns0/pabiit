const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/save-input', (req, res) => {
    const { userInput } = req.body;
    fs.appendFile('inputData.txt', `${userInput}\n`, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Failed to save input');
        } else {
            res.status(200).send('Input saved successfully');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});