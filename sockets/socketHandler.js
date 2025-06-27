import genStock from '../utils/genStock.js';

export const orders = [];
export const stocks = {
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

function updateRandomStocks(count = 3) {
  const keys = Object.keys(stocks).sort(() => 0.5 - Math.random()).slice(0, count);
  for (let symbol of keys) {
    const s = stocks[symbol];
    s.chg_f = parseFloat((s.chg_f + (Math.random() - 0.5) * 0.5).toFixed(2));
    s.p_close = parseFloat((s.p_close + (Math.random() - 0.5) * 0.5).toFixed(2));
    s.sell_vol += Math.floor(Math.random() * 5);
    s.sell = parseFloat((s.sell + (Math.random() - 0.5) * 5).toFixed(2));
    s.buy_vol += Math.floor(Math.random() * 5);
    s.buy = parseFloat((s.buy + (Math.random() - 0.5) * 5).toFixed(2));
    s.total_vol += Math.floor(Math.random() * 500);
    s.chg_p = ((s.chg_f / s.p_close) * 100).toFixed(2);
    s.high = parseFloat(Math.max(s.high, s.buy, s.sell).toFixed(2));
    s.low = parseFloat(Math.min(s.low, s.buy, s.sell).toFixed(2));
    s.avg = ((s.high + s.low) / 2).toFixed(2);
    s.trades += Math.floor(Math.random() * 10);
    s.l_time = new Date().toLocaleTimeString('en-US', { hour12: false });
  }
  return keys.map(k => stocks[k]);
}

export default function socketHandler(io) {
  setInterval(() => {
    const updated = updateRandomStocks();
    for (const [_, socket] of io.of('/').sockets) {
      if (!socket.symbolsSet) continue;
      const clientSymbols = Array.from(socket.symbolsSet);
      const filtered = updated.filter(s => clientSymbols.includes(s.symbol));
      if (filtered.length) socket.emit('stockUpdate', filtered);
    }
  }, 5000);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.symbolsSet = new Set();

    socket.on('subscribeToSymbols', (symbols) => {
      if (!Array.isArray(symbols)) return;
      symbols.forEach((symbol) => {
        symbol = symbol.trim().toUpperCase();
        socket.symbolsSet.add(symbol);
        if (!stocks[symbol]) stocks[symbol] = genStock(symbol);
      });
    });

    socket.on('placeOrder', (order) => {
      if (!order.symbol || !order.volume || !order.rate || !order.type || !order.account) {
        return socket.emit('orderError', { message: 'Invalid order data' });
      }

      const stock = stocks[order.symbol];
      if (!stock) {
        return socket.emit('orderError', { message: `Symbol ${order.symbol} not found` });
      }

      const rate = parseFloat(order.rate);
      const lowerCap = parseFloat((stock.buy * 0.9).toFixed(2));
      const upperCap = parseFloat((stock.buy * 1.1).toFixed(2));
      if (rate < lowerCap || rate > upperCap) {
        return socket.emit('orderError', {
          message: `Rate ${rate} is outside allowed range (${lowerCap} - ${upperCap})`,
        });
      }

      const orderData = {
        id: orders.length + 1,
        symbol: order.symbol,
        volume: parseInt(order.volume),
        rate,
        type: order.type,
        account: parseInt(order.account),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        counter: '',
        bRate: order.type === 'buy' ? rate : '',
        sRate: order.type === 'sell' ? rate : '',
        ticket: '1536',
        action: 'Filled',
        totalVol: parseInt(order.volume),
        totalVal: (parseInt(order.volume) * rate).toFixed(2),
        trader: 'mem0B11',
        inst: '',
        remaining: '0',
        flag: '',
      };

      orders.push(orderData);

      socket.emit('orderConfirmation', {
        message: `Order placed: ${order.type} ${order.volume} of ${order.symbol} at ${rate}`,
        order: orderData,
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
