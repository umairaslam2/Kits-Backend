import  oracledb from "oracledb";
import  dotenv  from "dotenv";
oracledb.initOracleClient({
  libDir: "./Oracle/instantclient_21_3",
});

dotenv.config();

// Create a pool and export it for use in your routes
async function initPool() {
  try {
    const pool = await oracledb.createPool({
      user: process.env.user,
      password: process.env.password,
      connectString: process.env.connectString,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
    });
    console.log("Connection pool started");
    return pool;
  } catch (err) {
    console.error("Error creating connection pool:", err);
    process.exit(1);
  }
}

// Initialize the pool on startup
const poolPromise = initPool();
export default poolPromise;
