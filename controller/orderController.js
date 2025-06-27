import { orders } from '../sockets/socketHandler.js';

export const getTradeHistory = (req, res) => {
  const { id } = req.query;
  const filtered = orders.filter((o) => o.account == id);
  res.json(filtered);
};

export const getLastTrade = (req, res) => {
  const { account, symbol } = req.body;
  if (!account || !symbol) {
    return res.status(400).json({ message: 'Account and symbol are required' });
  }
  const last = orders
    .filter(o => o.account === parseInt(account) && o.symbol === symbol)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  res.json({ lastTrade: last ? last.rate : null });
};
