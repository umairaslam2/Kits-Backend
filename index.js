import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Your frontend
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Generate a mock stock
function genStock(symbol) {
  return {
    market: 'REG',
    symbol,
    chg_f: parseFloat((Math.random() * 2).toFixed(2)),
    buy_vol: Math.floor(Math.random() * 100),
    buy: parseFloat((Math.random() * 100 + 100).toFixed(2)),
    sell: parseFloat((Math.random() * 100 + 101).toFixed(2)),
    sell_vol: Math.floor(Math.random() * 100),
    total_vol: parseFloat((Math.random() * 1000).toFixed(2)),
    chg_p: '0.00',
    p_close: parseFloat((Math.random() * 100 + 90).toFixed(2)),
    avg: 0,
    high: 0,
    low: 0,
    trades: Math.floor(Math.random() * 500),
    all_share_value: 0,
    l_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
    open: parseFloat((Math.random() * 100 + 90).toFixed(2)),
  };
}

// All initial stocks
let stocks = {
  PSO: genStock('PSO'),
  PPL: genStock('PPL'),
  LUCK: genStock('LUCK'),
  HBL: genStock('HBL'),
  UBL: genStock('UBL'),
  ENGRO: genStock('ENGRO'),
  MCB: genStock('MCB'),
  TRG: genStock('TRG'),
  DGKC: genStock('DGKC'),
  SNGP: genStock('SNGP'),
  HUBC: genStock('HUBC'),
  WIL: genStock('WIL'),
  MEZ: genStock('MEZ  '),
};

// Simulate updates to 3 random stocks every 5 seconds
const getRandomUpdatedSymbols = (count = 3) => {
  const keys = Object.keys(stocks);
  const randomKeys = keys.sort(() => 0.5 - Math.random()).slice(0, count);

  for (let symbol of randomKeys) {
    //console.log("random", randomKeys)
    
    const stock = stocks[symbol];
    //console.log('stock',stock)
    console.log("total",stock.total_vol)
    stock.chg_f += (Math.random() - 0.5) * 0.5;
    stock.p_close += (Math.random() - 0.5) * 0.5;
    stock.sell_vol += Math.floor(Math.random() * 5);
    stock.sell += Math.floor(Math.random() * 5);
    stock.buy_vol += Math.floor(Math.random() * 5);
    stock.buy += Math.floor(Math.random() * 5);
    stock.total_vol += Math.floor(Math.random() * 500);
    stock.chg_p = parseInt((stock.chg_f / stock.p_close * 100).toFixed(2)).toLocaleString();
    stock.avg = ((stock.high + stock.low) / 2).toFixed(2);
    stock.trades += Math.floor(Math.random() * 10);
    stock.l_time = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  return randomKeys.map(sym => stocks[sym]);
};

// 🔁 Send real-time updates to each connected socket
const sendUpdates = () => {
  const updatedData = getRandomUpdatedSymbols(); // ← This was missing

  for (const [id, socket] of io.of("/").sockets) {
    if (!socket.symbolsSet) continue;

    const clientSymbols = Array.from(socket.symbolsSet);
    const filteredData = updatedData.filter((item) =>
      clientSymbols.includes(item.symbol)
    );

    if (filteredData.length > 0) {
      socket.emit("stockUpdate", filteredData);
    }
  }
};


setInterval(sendUpdates, 5000);

// 📡 Socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.symbolsSet = new Set();

  socket.on('subscribeToSymbols', (symbols) => {
    if (!Array.isArray(symbols)) return;
    symbols.forEach((symbol) => socket.symbolsSet.add(symbol));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API for initial symbols fetch
app.post('/api/stock-data', (req, res) => {
  const { symbols } = req.body;

  if (!Array.isArray(symbols)) {
    return res.status(400).json({ message: 'Invalid symbols format' });
  }

  const data = symbols
    .filter((sym) => stocks[sym])
    .map((sym) => stocks[sym]);

  res.json(data);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
