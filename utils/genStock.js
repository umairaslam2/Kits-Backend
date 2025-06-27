export default function genStock(symbol) {
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
