import { stocks } from '../sockets/socketHandler.js';
import genStock from '../utils/genStock.js';

export const getStockData = (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols)) {
    return res.status(400).json({ message: 'Invalid symbols format' });
  }
  symbols.forEach((symbol) => {
    symbol = symbol.trim().toUpperCase();
    if (!stocks[symbol]) {
      stocks[symbol] = genStock(symbol);
    }
  });
  const data = symbols.map(sym => stocks[sym]);
  res.json(data);
};
