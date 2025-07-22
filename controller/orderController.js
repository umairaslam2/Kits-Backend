import poolPromise from '../database.js';
import oracledb from 'oracledb';

export const getTradeHistory = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Account ID is required' });
  }
  console.log('id:', id);

  let connection;
  try {
    connection = await (await poolPromise).getConnection();
    const query = `SELECT id, symbol, volume, rate, purchase_type, account, purchase_timestamp, 
                          purchase_date, counter, b_rate, s_rate, ticket, purchase_action, 
                          total_vol, total_val, trader, inst, remaining, flag 
                   FROM purchase 
                   WHERE account = :id`;
    console.log('Executing query:', query, 'with id:', parseInt(id)); 
    const result = await connection.execute(
      query,
      [parseInt(id)],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    // Map database column names to expected frontend aliases
    const mappedRows = result.rows.map(row => ({
      id: row.ID,
      symbol: row.SYMBOL,
      volume: row.VOLUME,
      rate: row.RATE,
      type: row.PURCHASE_TYPE, // Map to frontend-expected 'type'
      account: row.ACCOUNT,
      timestamp: row.PURCHASE_TIMESTAMP, // Map to 'timestamp'
      date: row.PURCHASE_DATE,
      counter: row.COUNTER,
      b_rate: row.B_RATE,
      s_rate: row.S_RATE,
      ticket: row.TICKET,
      action: row.PURCHASE_ACTION, // Map to 'action'
      total_vol: row.TOTAL_VOL,
      total_val: row.TOTAL_VAL,
      trader: row.TRADER,
      inst: row.INST,
      remaining: row.REMAINING,
      flag: row.FLAG,
    }));
    res.json(mappedRows);
  } catch (err) {
    console.error('Error fetching trade history:', err);
    console.error('Query causing error:', `SELECT id, symbol, volume, rate, purchase_type, account, purchase_timestamp, purchase_date, counter, b_rate, s_rate, ticket, purchase_action, total_vol, total_val, trader, inst, remaining, flag FROM purchase WHERE account = :id`);
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

export const getLastTrade = async (req, res) => {
  const { account, symbol } = req.body;
  if (!account || !symbol) {
    return res.status(400).json({ message: 'Account and symbol are required' });
  }

  let connection;
  try {
    connection = await (await poolPromise).getConnection();
    const query = `SELECT rate 
                  FROM purchase 
                  WHERE account = :account AND symbol = :symbol AND ROWNUM = 1 
                  ORDER BY purchase_timestamp DESC`;
    console.log('Executing query:', query, 'with account:', account, 'symbol:', symbol.trim().toUpperCase());
    const result = await connection.execute(
      query,
      [parseInt(account), symbol.trim().toUpperCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const lastTrade = result.rows[0];
    res.json({ lastTrade: lastTrade ? lastTrade.RATE : null });
  } catch (err) {
    console.error('Error fetching last trade:', err);
    console.error('Query causing error:', `SELECT rate FROM purchase WHERE account = :account AND symbol = :symbol AND ROWNUM = 1 ORDER BY purchase_timestamp DESC`);
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