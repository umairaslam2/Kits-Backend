import oracledb from 'oracledb';
import poolPromise from '../database.js';
import genStock from '../utils/genStock.js';

async function updateRandomStocks(count = 5) {
  let connection;
  try {
    connection = await (await poolPromise).getConnection();
    const query = `SELECT symbol FROM stocks WHERE ROWNUM <= :count ORDER BY DBMS_RANDOM.VALUE`;
    console.log('Executing query:', query, 'with count:', count);
    const result = await connection.execute(
      query,
      [count],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const symbols = result.rows.map(row => row.SYMBOL);
    const updatedStocks = [];

    for (let symbol of symbols) {
      const stockResult = await connection.execute(
        `SELECT market, symbol, chg_f, buy_vol, buy, sell, sell_vol, total_vol, chg_p, 
                p_close, avg, high, low, trades, all_share_value, l_time, open 
         FROM stocks WHERE symbol = :symbol`,
        [symbol],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (stockResult.rows.length === 0) {
        console.log(`Symbol ${symbol} not found, skipping.`);
        continue;
      }

      const s = stockResult.rows[0];
      const chg_f = parseFloat((s.CHG_F + (Math.random() - 0.5) * 0.5).toFixed(2));
      const p_close = parseFloat((s.P_CLOSE + (Math.random() - 0.5) * 0.5).toFixed(2));
      const total_vol = s.TOTAL_VOL + Math.floor(Math.random() * 500);
      const chg_p = parseFloat(((chg_f / p_close) * 100).toFixed(2));
      const high = parseFloat(Math.max(s.HIGH, s.BUY, s.SELL).toFixed(2));
      const low = parseFloat(Math.min(s.LOW, s.BUY, s.SELL).toFixed(2));
      const avg = parseFloat(((high + low) / 2).toFixed(2));
      const trades = s.TRADES + Math.floor(Math.random() * 10);
      const l_time = new Date().toLocaleTimeString('en-US', { hour12: false});

      // Enhanced logic for separate or together updates
      const updateMode = Math.floor(Math.random() * 3); // 0: both, 1: buy only, 2: sell only
      let buy_vol, buy, sell_vol, sell;

      if (updateMode === 0) {
        // Update both buy and sell together
        buy_vol = s.BUY_VOL + Math.floor(Math.random() * 5);
        buy = parseFloat((s.BUY + (Math.random() - 0.5) * 5).toFixed(2));
        sell_vol = s.SELL_VOL + Math.floor(Math.random() * 5);
        sell = parseFloat((s.SELL + (Math.random() - 0.5) * 5).toFixed(2));
      } else if (updateMode === 1) {
        // Update buy only
        buy_vol = s.BUY_VOL + Math.floor(Math.random() * 5);
        buy = parseFloat((s.BUY + (Math.random() - 0.5) * 5).toFixed(2));
        sell_vol = s.SELL_VOL; // No change
        sell = s.SELL; // No change
      } else {
        // Update sell only
        sell_vol = s.SELL_VOL + Math.floor(Math.random() * 5);
        sell = parseFloat((s.SELL + (Math.random() - 0.5) * 5).toFixed(2));
        buy_vol = s.BUY_VOL; // No change
        buy = s.BUY; // No change
      }

      await connection.execute(
        `UPDATE stocks 
         SET chg_f = :chg_f, p_close = :p_close, sell_vol = :sell_vol, sell = :sell, 
             buy_vol = :buy_vol, buy = :buy, total_vol = :total_vol, chg_p = :chg_p, 
             high = :high, low = :low, avg = :avg, trades = :trades, l_time = :l_time 
         WHERE symbol = :symbol`,
        {
          chg_f, p_close, sell_vol, sell, buy_vol, buy, total_vol, chg_p, high, low, avg, trades, l_time, symbol
        },
        { autoCommit: true }
      );

      updatedStocks.push({
        market: s.MARKET,
        symbol: s.SYMBOL,
        chg_f,
        buy_vol,
        buy,
        sell,
        sell_vol,
        total_vol,
        chg_p,
        p_close,
        avg,
        high,
        low,
        trades,
        all_share_value: s.ALL_SHARE_VALUE,
        l_time,
        open: s.OPEN,
      });
    }

    return updatedStocks;
  } catch (err) {
    console.error('Error updating stocks:', err);
    console.error('Query causing error:', `SELECT symbol FROM stocks WHERE ROWNUM <= :count ORDER BY DBMS_RANDOM.VALUE`);
    return [];
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

export default function socketHandler(io) {
  let lastUpdatedSymbols = new Set(); // Track recently updated symbols

  setInterval(async () => {
    let connection;
    try {
      connection = await (await poolPromise).getConnection();
      const result = await connection.execute(
        `SELECT symbol FROM stocks`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const allSymbols = result.rows.map(row => row.SYMBOL);
      const symbolsToUpdate = new Set();

      while (symbolsToUpdate.size < Math.min(5, allSymbols.length - lastUpdatedSymbols.size)) {
        const randomSymbol = allSymbols[Math.floor(Math.random() * allSymbols.length)];
        if (!lastUpdatedSymbols.has(randomSymbol)) {
          symbolsToUpdate.add(randomSymbol);
        }
      }

      const updatedStocks = [];
      for (let symbol of symbolsToUpdate) {
        const stockResult = await connection.execute(
          `SELECT market, symbol, chg_f, buy_vol, buy, sell, sell_vol, total_vol, chg_p, 
                  p_close, avg, high, low, trades, all_share_value, l_time, open 
           FROM stocks WHERE symbol = :symbol`,
          [symbol],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (stockResult.rows.length === 0) continue;

        const s = stockResult.rows[0];
        const chg_f = parseFloat((s.CHG_F + (Math.random() - 0.5) * 0.5).toFixed(2));
        const p_close = parseFloat((s.P_CLOSE + (Math.random() - 0.5) * 0.5).toFixed(2));
        const total_vol = s.TOTAL_VOL + Math.floor(Math.random() * 500);
        const chg_p = parseFloat(((chg_f / p_close) * 100).toFixed(2));
        const high = parseFloat(Math.max(s.HIGH, s.BUY, s.SELL).toFixed(2));
        const low = parseFloat(Math.min(s.LOW, s.BUY, s.SELL).toFixed(2));
        const avg = parseFloat(((high + low) / 2).toFixed(2));
        const trades = s.TRADES + Math.floor(Math.random() * 10);
        const l_time = new Date().toLocaleTimeString('en-US', { hour12: false});

        // Enhanced logic for separate or together updates
        const updateMode = Math.floor(Math.random() * 3); // 0: both, 1: buy only, 2: sell only
        let buy_vol, buy, sell_vol, sell;

        if (updateMode === 0) {
          // Update both buy and sell together
          buy_vol = s.BUY_VOL + Math.floor(Math.random() * 5);
          buy = parseFloat((s.BUY + (Math.random() - 0.5) * 5).toFixed(2));
          sell_vol = s.SELL_VOL + Math.floor(Math.random() * 5);
          sell = parseFloat((s.SELL + (Math.random() - 0.5) * 5).toFixed(2));
        } else if (updateMode === 1) {
          // Update buy only
          buy_vol = s.BUY_VOL + Math.floor(Math.random() * 5);
          buy = parseFloat((s.BUY + (Math.random() - 0.5) * 5).toFixed(2));
          sell_vol = s.SELL_VOL; // No change
          sell = s.SELL; // No change
        } else {
          // Update sell only
          sell_vol = s.SELL_VOL + Math.floor(Math.random() * 5);
          sell = parseFloat((s.SELL + (Math.random() - 0.5) * 5).toFixed(2));
          buy_vol = s.BUY_VOL; // No change
          buy = s.BUY; // No change
        }

        await connection.execute(
          `UPDATE stocks 
           SET chg_f = :chg_f, p_close = :p_close, sell_vol = :sell_vol, sell = :sell, 
               buy_vol = :buy_vol, buy = :buy, total_vol = :total_vol, chg_p = :chg_p, 
               high = :high, low = :low, avg = :avg, trades = :trades, l_time = :l_time 
           WHERE symbol = :symbol`,
          {
            chg_f, p_close, sell_vol, sell, buy_vol, buy, total_vol, chg_p, high, low, avg, trades, l_time, symbol
          },
          { autoCommit: true }
        );

        updatedStocks.push({
          market: s.MARKET,
          symbol: s.SYMBOL,
          chg_f,
          buy_vol,
          buy,
          sell,
          sell_vol,
          total_vol,
          chg_p,
          p_close,
          avg,
          high,
          low,
          trades,
          all_share_value: s.ALL_SHARE_VALUE,
          l_time,
          open: s.OPEN,
        });
      }

      lastUpdatedSymbols = new Set([...lastUpdatedSymbols, ...symbolsToUpdate]);
      if (lastUpdatedSymbols.size >= allSymbols.length) {
        lastUpdatedSymbols.clear(); // Reset after all symbols are updated
      }

      for (const [_, socket] of io.of('/').sockets) {
        if (!socket.symbolsSet) continue;
        const clientSymbols = Array.from(socket.symbolsSet);
        const filtered = updatedStocks.filter(s => clientSymbols.includes(s.symbol));
        if (filtered.length) socket.emit('stockUpdate', filtered);
      }
    } catch (err) {
      console.error('Error updating stocks:', err);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  }, 5000);

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);
    socket.symbolsSet = new Set();

    socket.on('subscribeToSymbols', async (symbols) => {
      if (!Array.isArray(symbols)) {
        socket.emit('subscribeError', { message: 'Symbols must be an array' });
        return;
      }

      let connection;
      try {
        connection = await (await poolPromise).getConnection();
        for (let symbol of symbols) {
          symbol = symbol.trim().toUpperCase();
          if (!symbol) continue;
          socket.symbolsSet.add(symbol);

          const result = await connection.execute(
            `SELECT market, symbol, chg_f, buy_vol, buy, sell, sell_vol, total_vol, chg_p, 
                    p_close, avg, high, low, trades, all_share_value, l_time, open 
             FROM stocks WHERE symbol = :symbol`,
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
            socket.emit('stockUpdate', [newStock]);
          } else {
            socket.emit('stockUpdate', [result.rows[0]]);
          }
        }
      } catch (err) {
        console.error('Error subscribing to symbols:', err);
        socket.emit('subscribeError', { message: 'Failed to subscribe to symbols' });
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            console.error('Error closing connection:', err);
          }
        }
      }
    });

    socket.on('placeOrder', async (order) => {
      if (!order.symbol || !order.volume || !order.rate || !order.type || !order.account) {
        return socket.emit('orderError', { message: 'Invalid order data: symbol, volume, rate, type, and account are required' });
      }

      let connection;
      try {
        connection = await (await poolPromise).getConnection();
        await connection.execute(`BEGIN :ret := SYS.DBMS_TRANSACTION.LOCAL_TRANSACTION_ID; END;`, { ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING } });

        const stockResult = await connection.execute(
          `SELECT buy FROM stocks WHERE symbol = :symbol`,
          [order.symbol.trim().toUpperCase()],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (stockResult.rows.length === 0) {
          await connection.execute(`ROLLBACK`);
          return socket.emit('orderError', { message: `Symbol ${order.symbol} not found` });
        }

        const stock = stockResult.rows[0];
        const rate = parseFloat(order.rate);
        const lowerCap = parseFloat((stock.BUY * 0.9).toFixed(2));
        const upperCap = parseFloat((stock.BUY * 1.1).toFixed(2));
        if (rate < lowerCap || rate > upperCap) {
          await connection.execute(`ROLLBACK`);
          return socket.emit('orderError', {
            message: `Rate ${rate} is outside allowed range (${lowerCap} - ${upperCap})`,
          });
        }

        const orderData = {
          symbol: order.symbol.trim().toUpperCase(),
          volume: parseInt(order.volume),
          rate,
          type: order.type.toLowerCase(),
          account: parseInt(order.account),
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString(),
          counter: '',
          bRate: order.type.toLowerCase() === 'buy' ? rate : null,
          sRate: order.type.toLowerCase() === 'sell' ? rate : null,
          ticket: '1536',
          action: 'Filled',
          totalVol: parseInt(order.volume),
          totalVal: parseFloat((parseInt(order.volume) * rate).toFixed(2)),
          trader: 'mem0B11',
          inst: '',
          remaining: '0',
          flag: '',
        };

        const result = await connection.execute(
          `INSERT INTO purchase (id, symbol, volume, rate, purchase_type, account, purchase_timestamp, 
                                purchase_date, counter, b_rate, s_rate, ticket, purchase_action, 
                                total_vol, total_val, trader, inst, remaining, flag) 
           VALUES (product_seq.NEXTVAL, :symbol, :volume, :rate, :purchase_type, :account, 
                   :purchase_timestamp, :purchase_date, :counter, :b_rate, :s_rate, :ticket, 
                   :purchase_action, :total_vol, :total_val, :trader, :inst, :remaining, :flag) 
           RETURNING id INTO :id`,
          {
            symbol: orderData.symbol,
            volume: orderData.volume,
            rate: orderData.rate,
            purchase_type: orderData.type,
            account: orderData.account,
            purchase_timestamp: orderData.timestamp,
            purchase_date: orderData.date,
            counter: orderData.counter,
            b_rate: orderData.bRate,
            s_rate: orderData.sRate,
            ticket: orderData.ticket,
            purchase_action: orderData.action,
            total_vol: orderData.totalVol,
            total_val: orderData.totalVal,
            trader: orderData.trader,
            inst: orderData.inst,
            remaining: orderData.remaining,
            flag: orderData.flag,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          },
          { autoCommit: false }
        );

        orderData.id = result.outBinds.id[0];
        await connection.execute(`COMMIT`);

        socket.emit('orderConfirmation', {
          message: `Order placed: ${orderData.type} ${orderData.volume} of ${orderData.symbol} at ${orderData.rate}`,
          order: orderData,
        });
      } catch (err) {
        console.error('Error placing order:', err);
        if (connection) await connection.execute(`ROLLBACK`);
        socket.emit('orderError', { message: 'Failed to place order due to server error' });
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            console.error('Error closing connection:', err);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}



