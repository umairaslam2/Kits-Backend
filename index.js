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
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store orders (in-memory for simplicity; use a database in production)
const orders = [];
console.log("View Orders",orders)
// Generate a mock stock
function genStock(symbol) {
  const basePrice = Math.random() * 100 + 90;
  return {
    market: 'REG',
    symbol,
    chg_f: parseFloat((Math.random() * 2 - 1).toFixed(2)),
    buy_vol: Math.floor(Math.random() * 100),
    buy: parseFloat((basePrice - Math.random() * 2).toFixed(2)),
    sell: parseFloat((basePrice + Math.random() * 2).toFixed(2)),
    sell_vol: Math.floor(Math.random() * 100),
    total_vol: Math.floor(Math.random() * 1000),
    chg_p: '0.00',
    p_close: parseFloat(basePrice.toFixed(2)),
    avg: parseFloat(basePrice.toFixed(2)),
    high: parseFloat((basePrice + Math.random() * 5).toFixed(2)),
    low: parseFloat((basePrice - Math.random() * 5).toFixed(2)),
    trades: Math.floor(Math.random() * 500),
    all_share_value: 0,
    l_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
    open: parseFloat(basePrice.toFixed(2)),
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
  MEZ: genStock('MEZ'),
};

// Simulate updates to 3 random stocks every 5 seconds
const getRandomUpdatedSymbols = (count = 3) => {
  const keys = Object.keys(stocks);
  const randomKeys = keys.sort(() => 0.5 - Math.random()).slice(0, count);

  for (let symbol of randomKeys) {
    const stock = stocks[symbol];
    stock.chg_f = parseFloat((stock.chg_f + (Math.random() - 0.5) * 0.5).toFixed(2));
    stock.p_close = parseFloat((stock.p_close + (Math.random() - 0.5) * 0.5).toFixed(2));
    stock.sell_vol += Math.floor(Math.random() * 5);
    stock.sell = parseFloat((stock.sell + (Math.random() - 0.5) * 5).toFixed(2));
    stock.buy_vol += Math.floor(Math.random() * 5);
    stock.buy = parseFloat((stock.buy + (Math.random() - 0.5) * 5).toFixed(2));
    stock.total_vol += Math.floor(Math.random() * 500);
    stock.chg_p = ((stock.chg_f / stock.p_close) * 100).toFixed(2);
    stock.high = parseFloat(Math.max(stock.high, stock.buy, stock.sell).toFixed(2));
    stock.low = parseFloat(Math.min(stock.low, stock.buy, stock.sell).toFixed(2));
    stock.avg = ((stock.high + stock.low) / 2).toFixed(2);
    stock.trades += Math.floor(Math.random() * 10);
    stock.l_time = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  return randomKeys.map((sym) => stocks[sym]);
};

// Send real-time updates to each connected socket
const sendUpdates = () => {
  const updatedData = getRandomUpdatedSymbols();

  for (const [id, socket] of io.of('/').sockets) {
    if (!socket.symbolsSet) continue;

    const clientSymbols = Array.from(socket.symbolsSet);
    const filteredData = updatedData.filter((item) => clientSymbols.includes(item.symbol));

    if (filteredData.length > 0) {
      socket.emit('stockUpdate', filteredData);
    }
  }
};

setInterval(sendUpdates, 5000);

// Socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.symbolsSet = new Set();

  socket.on('subscribeToSymbols', (symbols) => {
    if (!Array.isArray(symbols)) return;
    symbols.forEach((symbol) => {
      symbol = symbol.trim().toUpperCase();
      socket.symbolsSet.add(symbol);
      if (!stocks[symbol]) {
        stocks[symbol] = genStock(symbol);
        console.log(`Added new symbol: ${symbol}`);
      }
    });
  });

  // Replace the placeOrder event handler in server.js
socket.on('placeOrder', (order) => {
  if (!order.symbol || !order.volume || !order.rate || !order.type || !order.account) {
    socket.emit('orderError', { message: 'Invalid order data' });
    return;
  }

  const stock = stocks[order.symbol];
  if (!stock) {
    socket.emit('orderError', { message: `Symbol ${order.symbol} not found` });
    return;
  }

  const buyPrice = stock.buy;
  const lowerCap = parseFloat((buyPrice * 0.9).toFixed(2));
  const upperCap = parseFloat((buyPrice * 1.1).toFixed(2));
  const rate = parseFloat(order.rate);
  if (rate < lowerCap || rate > upperCap) {
    socket.emit('orderError', {
      message: `Rate ${rate} is outside allowed range (${lowerCap} - ${upperCap})`,
    });
    return;
  }

  const orderData = {
    id: orders.length + 1,
    symbol: order.symbol,
    volume: parseInt(order.volume),
    rate: parseFloat(order.rate),
    type: order.type,
    account: parseInt(order.account),
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(), // Added for DailyTradeLog
    counter: "", // Can be added dynamically
    bRate: order.type === "buy" ? order.rate : "",
    sRate: order.type === "sell" ? order.rate : "",
    ticket: "1536", // Placeholder
    action: "Filled",
    totalVol: parseInt(order.volume),
    totalVal: (parseInt(order.volume) * parseFloat(order.rate)).toFixed(2),
    trader: "mem0B11", // Placeholder
    inst: "", // Placeholder
    remaining: "0",
    flag: "",
  };
  orders.push(orderData);
  console.log('Order placed:', orderData);

  socket.emit('orderConfirmation', {
    message: `Order placed: ${order.type} ${order.volume} of ${order.symbol} at ${order.rate}`,
    order: orderData,
  });
});

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API for initial symbols fetch
app.post('/api/stock-data', (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols)) {
      return res.status(400).json({ message: 'Invalid symbols format' });
    }

    symbols.forEach((symbol) => {
      symbol = symbol.trim().toUpperCase();
      if (!stocks[symbol]) {
        stocks[symbol] = genStock(symbol);
        console.log(`Added new symbol via API: ${symbol}`);
      }
    });

    const data = symbols.filter((sym) => stocks[sym]).map((sym) => stocks[sym]);

    res.json(data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API for last trade price by account and symbol
app.post('/api/last-trade', (req, res) => {
  try {
    const { account, symbol } = req.body;
    if (!account || !symbol) {
      return res.status(400).json({ message: 'Account and symbol are required' });
    }

    // Find the most recent order for the given account and symbol
    const lastOrder = orders
      .filter((order) => order.account === parseInt(account) && order.symbol === symbol)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (lastOrder) {
      res.json({ lastTrade: lastOrder.rate });
    } else {
      res.json({ lastTrade: null });
    }
  } catch (error) {
    console.error('Last trade API error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this endpoint in your existing server.js
app.get('/api/trade-history', (req, res) => {
  const { id } = req.query
  console.log("Account Id" ,id)
  console.log("orders data-->>>",orders)
 const filterData = orders
  ? orders.filter((item) => item.account == id)
  : [];
  console.log("Filter Data ",filterData)
  try {
    res.json(filterData);
  } catch (error) {
    console.error('Trade history API error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});