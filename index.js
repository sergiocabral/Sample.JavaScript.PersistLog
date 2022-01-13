const path = require('path');
const express = require('express');
const axios = require('axios');

class App {
    constructor() {
        this.__port = process.env.PORT || 3000;
        this.__express = express();
        this.__middleware();
        this.__routes();
    }

    __middleware() {
        this.__express.use(express.json());
        this.__express.use(express.static(path.join(__dirname, 'wwwroot')));
    }

    __routes() {
        this.__express.get('/api/coins', async (req, res) => {
            res.json("Hello World, Coins!");
        });

        this.__express.get('/api/convert/:from/:ammount?/:to?', async (req, res) => {
            res.json("Hello World, Convert!");
        });
    }

    start() {
        this.__express.listen(this.__port, () => {
            console.log(`Server listening on port ${this.__port}`);
        });
    }
}

new App().start();
