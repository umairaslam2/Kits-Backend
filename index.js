import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors'; 

const app = express();

app.use(express.json());
app.use(cors()); 

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Create HTTP server and integrate with Socket.IO
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST'], 
    credentials: true, 
  },
});

// Initial fake stock data matching your frontend structure
let stocks = {
  PS0: {
    market: 'REG',
    symbol: 'PS0',
    chg_f: 0.17,
    buy_vol: 16,
    buy: 61.45,
    sell: 61.50,
    sell_vol: 61.50,
    total_vol: 263,
    chg_p: '0.28',
    p_close: 61.33,
    avg: 61.75,
    high: 61.75,
    low: 61.5,
    trades: 709,
    all_share_value: 61.50,
    l_time: '14:23:33',
    open: 61.32,
  },
  PPL: {
    market: 'REG',
    symbol: 'PPL',
    chg_f: 5.5,
    buy_vol: 26,
    buy: 371.25,
    sell: 371.75,
    sell_vol: 371.75,
    total_vol: 371.302,
    chg_p: '1.50',
    p_close: 366,
    avg: 378.25,
    high: 378.25,
    low: 371.25,
    trades: 512,
    all_share_value: 152,
    l_time: '14:23:33',
    open: 369,
  },
  LUCK: {
    market: 'REG',
    symbol: 'LUCK',
    chg_f: -0.62,
    buy_vol: 13,
    buy: 334.99,
    sell: 335.00,
    sell_vol: 335.00,
    total_vol: 450.726,
    chg_p: '-0.18',
    p_close: 335.62,
    avg: 338.85,
    high: 338.85,
    low: 334.5,
    trades: 312,
    all_share_value: 136,
    l_time: '14:23:33',
    open: 336,
  },
};

// Update stock data function
const updateStockData = () => {
  for (let symbol in stocks) {
    stocks[symbol].chg_f += (Math.random() - 0.5) * 0.5;
    stocks[symbol].p_close += (Math.random() - 0.5) * 0.5;
    stocks[symbol].buy_vol += Math.floor(Math.random() * 5);
    stocks[symbol].sell_vol += Math.floor(Math.random() * 5);
    stocks[symbol].total_vol += Math.random() * 10;
    stocks[symbol].chg_p = (stocks[symbol].chg_f / stocks[symbol].p_close * 100).toFixed(2);
    stocks[symbol].avg = ((stocks[symbol].high + stocks[symbol].low) / 2).toFixed(2);
    stocks[symbol].trades += Math.floor(Math.random() * 10);
    stocks[symbol].l_time = new Date().toLocaleTimeString('en-US', { hour12: false });
  }
  io.emit('stockUpdate', Object.values(stocks)); // Broadcast updated data as array
};

// Server setup
io.on('connection', (socket) => {
  console.log('Client connected at', new Date().toLocaleTimeString());
  socket.emit('stockUpdate', Object.values(stocks)); // Send initial data

  // Handle POST (order placement) via Socket.IO
  socket.on('placeOrder', (order) => {
    console.log('Order received:', order);
    const { symbol, type, quantity } = order;
    if (stocks[symbol]) {
      const response = {
        status: 'success',
        message: `${type.toUpperCase()} order of ${quantity} shares for ${symbol} placed at ${stocks[symbol].p_close}`,
        updatedPrice: stocks[symbol].p_close,
      };
      socket.emit('orderResponse', response); // Send response
    } else {
      socket.emit('orderResponse', { status: 'error', message: 'Invalid symbol' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected at', new Date().toLocaleTimeString());
  });
});

// Update data every 2 seconds
setInterval(updateStockData, 2000);

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} at ${new Date().toLocaleTimeString()}`);
});