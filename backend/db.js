import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

// Create a connection to the database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password', // Replace with your actual database password
  database: 'finance'  // Ensure the database is correctly named and created
});

// Export the promise-based pool and UUID generator
export { pool, uuidv4 };
