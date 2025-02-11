const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Log successful connection
pool.getConnection()
  .then((connection) => {
    console.log('Successfully connected to the database!');
    connection.release(); // Release the connection back to the pool
  })
  .catch((err) => {
    console.error('Error connecting to the database:', err.message);
  });

module.exports = pool;
