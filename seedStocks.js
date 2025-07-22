import oracledb from 'oracledb';
import poolPromise from '../database.js';
import genStock from '../utils/genStock.js';

const defaultSymbols = [
  'PSO', 'PPL', 'LUCK', 'HBL', 'UBL', 'ENGRO', 'MCB', 'TRG', 'DGKC', 'SNGP', 'HUBC', 'WIL', 'MEZ'
];

async function seedStocks() {
  let connection;
  try {
    connection = await (await poolPromise).getConnection();
    for (const symbol of defaultSymbols) {
      const result = await connection.execute(
        `SELECT COUNT(*) AS count FROM stocks WHERE symbol = :symbol`,
        [symbol],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (result.rows[0].COUNT > 0) {
        console.log(`Symbol ${symbol} already exists, skipping.`);
        continue;
      }

      const stock = genStock(symbol);
      await connection.execute(
        `INSERT INTO stocks (market, symbol, chg_f, buy_vol, buy, sell, sell_vol, total_vol, 
                            chg_p, p_close, avg, high, low, trades, all_share_value, l_time, open) 
         VALUES (:market, :symbol, :chg_f, :buy_vol, :buy, :sell, :sell_vol, :total_vol, 
                 :chg_p, :p_close, :avg, :high, :low, :trades, :all_share_value, :l_time, :open)`,
        {
          market: stock.market,
          symbol: stock.symbol,
          chg_f: stock.chg_f,
          buy_vol: stock.buy_vol,
          buy: stock.buy,
          sell: stock.sell,
          sell_vol: stock.sell_vol,
          total_vol: stock.total_vol,
          chg_p: stock.chg_p,
          p_close: stock.p_close,
          avg: stock.avg,
          high: stock.high,
          low: stock.low,
          trades: stock.trades,
          all_share_value: stock.all_share_value,
          l_time: stock.l_time,
          open: stock.open,
        },
        { autoCommit: true }
      );
      console.log(`Inserted stock: ${symbol}`);
    }
    console.log('Stock seeding completed.');
  } catch (err) {
    console.error('Error seeding stocks:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

seedStocks().then(() => process.exit(0)).catch(() => process.exit(1));