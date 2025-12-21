import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const ConnectDB = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

(async () => {
  try {
    const [rows] = await ConnectDB.execute("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
})();

export default ConnectDB;
