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
        const url = 'https://api2.binance.com/api/v3/ticker/24hr';
        const baseCoin = 'BUSD';

        console.log(`Carregando dados da API da Binance em ${url}.`);
        try {
            const response = await axios.get(url);
            console.debug(`Recebido dados da API da Binance. Status: ${response.status}, ${response.statusText}. Dados: ${JSON.stringify(response.data)}`);
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
                console.debug(`A lista de moedas foi atualizada com ${this.__coins.length} itens: ${this.__coins.map(coin => coin.symbol).join(', ')}`);
            } catch (error) {
            console.error(`Ocorreu um erro ao carregar dados da API da Binance: ${error?.message ?? error}`);
        }
    }

    __middleware() {
        this.__express.use(express.json());

        const wwwroot = path.join(__dirname, 'wwwroot');
        this.__express.use(express.static(wwwroot));
        console.log(`Aplicação está usando a pasta ${wwwroot} como wwwroot.`);

        this.__express.use((req, res, next) => {
            res.on('finish', () => {
                if (res.statusCode >= 400) {
                    console.warn(`Resposta ${res.statusCode} para ${req.method} ${req.url}`);
                } else {
                    console.debug(`Resposta ${res.statusCode} para ${req.method} ${req.url}`);
                }
            });
            next();
        });
    }

    __routes() {
        this.__express.post('/api/log/:key', async (req, res) => {
            switch (req.params.key) {
                case 'frontpage':
                    console.log(`Página inicial carregada por um usuário.`);
                    break;
                case 'ping':
                    console.debug(`Usuário pingou o servidor.`);
                    break;
                default:
                    console.warn(`Recebido evento de log deconhecido: ${req.params.key}`);
                    break;
            }
            res.status(200).send();
        });

        this.__express.get('/api/coins', async (req, res) => {
            res.json(this.__availableSymbols);
        });

        this.__express.get('/api/convert/:from/:ammount?/:to?', async (req, res) => {
            const from = String(req.params.from).toUpperCase().trim();
            const to = String(req.params.to ?? this.__coins.find(coin => coin.baseCoin).symbol).toUpperCase().trim();
            const ammount = Number(req.params.ammount ?? 1);

            if (this.__availableSymbols.length === 0) {
                console.warn(`Conversão não pode ser realizada pois a lista de moedas está vazia.`);
                res.status(500).json({ error: 'No coins available' });
            } else if (Number.isNaN(ammount)) {
                console.warn(`Conversão não pode ser realizada pois o valor da moeda é inválido.`);
                res.status(400).json({ error: 'Ammount must be a number' });
            } else if (!this.__availableSymbols.includes(from) || !this.__availableSymbols.includes(to)) {
                console.warn(`Conversão não pode ser realizada pois a moeda ${from} ou ${to} não está disponível.`);
                res.status(400).json({ error: `Symbol must be one of: ${this.__availableSymbols.join(', ')}` });
            } else {
                const fromPrice = this.__coins.find(coin => coin.symbol === from).price;
                const toPrice = this.__coins.find(coin => coin.symbol === to).price;
                const result = (ammount * fromPrice / toPrice).toFixed(8);
                console.log(`Convertendo ${ammount} ${from} para ${to} = ${result}`);
                res.json({result});
            }
        });
    }

    start() {
        this.__express.listen(this.__port, () => {
            console.log(`Servidor HTTP iniciado na porta ${this.__port}.`);
        });
    }
}

try {
    console.info('Iniciando a aplicação.');
    new App().start();
    console.info('Aplicação finalizada.');
} catch (error) {
    console.error(`Um erro não tratado ocorreu: ${error?.message ?? error}`);
}
