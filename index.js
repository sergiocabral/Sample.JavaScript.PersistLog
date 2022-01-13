const path = require('path');
const express = require('express');
const axios = require('axios');

class App {
    constructor() {
        this.__port = process.env.PORT || 3000;
        this.__express = express();
        this.__coins = [];
        this.__middleware();
        this.__routes();
        this.__loadData();
    }

    get __availableSymbols() {
        return this.__coins.map(coin => coin.symbol);
    }

    async __loadData() {
        const baseCoin = 'BUSD';
        const response = await axios.get('https://api2.binance.com/api/v3/ticker/24hr');
        this.__coins = response.data
            .filter(coin => 
                coin.lastPrice > 0 && (
                    coin.symbol.startsWith(baseCoin) ||
                    coin.symbol.endsWith(baseCoin)
                )
            )
            .map(coin => ({
                symbol: coin.symbol.replace(baseCoin, '').trim().toUpperCase(),
                price: coin.symbol.startsWith(baseCoin) ? 1 / coin.lastPrice : Number(coin.lastPrice),
            }))
            .concat([{
                symbol: baseCoin,
                price: 1,
                baseCoin: true
            }])
            .sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    __middleware() {
        this.__express.use(express.json());
        this.__express.use(express.static(path.join(__dirname, 'wwwroot')));
    }

    __routes() {
        this.__express.get('/api/coins', async (req, res) => {
            res.json(this.__availableSymbols);
        });

        this.__express.get('/api/convert/:from/:ammount?/:to?', async (req, res) => {
            const from = String(req.params.from).toUpperCase().trim();
            const to = String(req.params.to ?? this.__coins.find(coin => coin.baseCoin).symbol).toUpperCase().trim();
            const ammount = Number(req.params.ammount ?? 1);

            if (this.__availableSymbols.length === 0) {
                res.status(500).json({ error: 'No coins available' });
            } else if (Number.isNaN(ammount)) {
                res.status(400).json({ error: 'Ammount must be a number' });
            } else if (!this.__availableSymbols.includes(from) || !this.__availableSymbols.includes(to)) {
                res.status(400).json({ error: `Symbol must be one of: ${this.__availableSymbols.join(', ')}` });
            } else {
                const fromPrice = this.__coins.find(coin => coin.symbol === from).price;
                const toPrice = this.__coins.find(coin => coin.symbol === to).price;
                res.json({result: (ammount * fromPrice / toPrice).toFixed(8)});
            }
        });
    }

    start() {
        this.__express.listen(this.__port, () => {
            console.log(`Server listening on port ${this.__port}`);
        });
    }
}

new App().start();
