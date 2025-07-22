import poolPromise from '../database.js';
import oracledb from 'oracledb';
import genStock from '../utils/genStock.js';

export const getStockData = async (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols)) {
    return res.status(400).json({ message: 'Invalid symbols format' });
  }

  let connection;
  try {
    connection = await (await poolPromise).getConnection();
    const data = [];

    for (let symbol of symbols) {
      symbol = symbol.trim().toUpperCase();
      const result = await connection.execute(
        `SELECT market, symbol, chg_f, buy_vol, buy, sell, sell_vol, total_vol, chg_p, 
                p_close, avg, high, low, trades, all_share_value, l_time, open 
         FROM stocks 
         WHERE symbol = :symbol`,
        [symbol],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows.length === 0) {
        const newStock = genStock(symbol);
        await connection.execute(
          `INSERT INTO stocks (market, symbol, chg_f, buy_vol, buy, sell, sell_vol, total_vol, 
                              chg_p, p_close, avg, high, low, trades, all_share_value, l_time, open) 
           VALUES (:market, :symbol, :chg_f, :buy_vol, :buy, :sell, :sell_vol, :total_vol, 
                   :chg_p, :p_close, :avg, :high, :low, :trades, :all_share_value, :l_time, :open)`,
          {
            market: newStock.market,
            symbol: newStock.symbol,
            chg_f: newStock.chg_f,
            buy_vol: newStock.buy_vol,
            buy: newStock.buy,
            sell: newStock.sell,
            sell_vol: newStock.sell_vol,
            total_vol: newStock.total_vol,
            chg_p: newStock.chg_p,
            p_close: newStock.p_close,
            avg: newStock.avg,
            high: newStock.high,
            low: newStock.low,
            trades: newStock.trades,
            all_share_value: newStock.all_share_value,
            l_time: newStock.l_time,
            open: newStock.open,
          },
          { autoCommit: true }
        );
        data.push(newStock);
      } else {
        data.push(result.rows[0]);
      }
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching stock data:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
};