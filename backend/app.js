import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { pool, uuidv4 } from './db.js';
import bcrypt from 'bcryptjs';
import cors from 'cors';

// Convert the URL of the current module to a path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express
const app = express();
app.use(express.json()); // To parse JSON bodies

app.use(cors({
  origin: 'http://localhost:3002', // Allow requests from this origin
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

// Setup session management
app.use(session({
  secret: 'your-very-secure-secret', // Replace with your own secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // User is authenticated, proceed to the next middleware or route handler
  } else {
    return res.status(401).json({ error: 'Unauthorized' }); // User is not authenticated
  }
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Register a new user
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const id = uuidv4();

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with default balance of $100,000
    const [result] = await pool.query(
      'INSERT INTO `user` (id, username, email, password) VALUES (?, ?, ?, ?)',
      [id, username, email, hashedPassword]
    );
    res.status(201).json({ id, username, email });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login a user
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user by email
    const [rows] = await pool.query('SELECT id, username, email, password FROM `user` WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Save user info in session
    req.session.user = { id: user.id, username: user.username, email: user.email };
    console.log(req.session.user)
    // Return user details (exclude password for security)
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve the dashboard page (this is where your frontend's index.html would be served)
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid'); // Assuming you're using express-session
    res.status(200).json({ message: 'Logged out successfully' });
  });
});


// Get all users
app.get('/users', ensureAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, email FROM `user`');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user data
app.get('/api/user-data', ensureAuthenticated, async (req, res) => {
  const user_id = req.session.user?.id;

  try {
    // Fetch user info including balance
    const [userRows] = await pool.query(
      'SELECT username, email, balance FROM `user` WHERE id = ?',
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch stock holdings for the user
    /*const [stockRows] = await pool.query(
      'SELECT stock_name, SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS quantity FROM `stock_transaction` WHERE user_id = ? GROUP BY stock_name',
      [user_id]
    );*/
    const [stockRows] = await pool.query(
      'SELECT stock_name, shares FROM `shareholding` WHERE user_id = ?',
      [user_id]
    );
    console.log(stockRows)
    res.json({
      username: userRows[0].username,
      email: userRows[0].email,
      balance: userRows[0].balance,
      holdings: stockRows // Returns an array of objects with stock_name and shares
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user by ID
app.get('/users/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT id, username, email FROM `user` WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a user
app.put('/users/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { username, email, password } = req.body;

  try {
    // Update user details, include password update if provided
    let query = 'UPDATE `user` SET username = ?, email = ?';
    let values = [username, email];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      values.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    values.push(id);

    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ id, username, email });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a user
app.delete('/users/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM `user` WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Buy Stock API
// app.post('/buy', ensureAuthenticated, async (req, res) => {
//   const { stock_name, quantity, price_per_unit } = req.body;
//   const user_id = req.session.user?.id;

//   try {
//     const totalAmount = quantity * price_per_unit;

//     const [userRows] = await pool.query('SELECT balance FROM `user` WHERE id = ?', [user_id]);
//     if (userRows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const userBalance = userRows[0].balance;
//     if (userBalance < totalAmount) {
//       return res.status(400).json({ error: 'Insufficient balance' });
//     }

//     const transactionId = uuidv4();
//     await pool.query(
//       'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
//       [transactionId, user_id, stock_name, quantity, totalAmount, 'BUY']
//     );

//     await pool.query('UPDATE `user` SET balance = balance - ? WHERE id = ?', [totalAmount, user_id]);

//     res.status(201).json({ message: 'Stock bought successfully' });
//   } catch (error) {
//     console.error('Error buying stock:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// Buy Stock API
// app.post('/buy', ensureAuthenticated, async (req, res) => {
//   const { stock_name, quantity, price_per_unit } = req.body;
//   const user_id = req.session.user?.id;

//   try {
//     const totalAmount = quantity * price_per_unit;

//     const [userRows] = await pool.query('SELECT balance FROM `user` WHERE id = ?', [user_id]);
//     if (userRows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const userBalance = userRows[0].balance;
//     if (userBalance < totalAmount) {
//       return res.status(400).json({ error: 'Insufficient balance' });
//     }

//     const transactionId = uuidv4();
//     const transactionTime = new Date(); // Get the current date and time

//     await pool.query(
//       'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
//       [transactionId, user_id, stock_name, quantity, totalAmount, 'BUY', transactionTime]
//     );

//     await pool.query('UPDATE `user` SET balance = balance - ? WHERE id = ?', [totalAmount, user_id]);

//     res.status(201).json({ message: 'Stock bought successfully' });
//   } catch (error) {
//     console.error('Error buying stock:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// Buy Stock API
app.post('/buy', ensureAuthenticated, async (req, res) => {
  const { stock_name, quantity, price_per_unit } = req.body;
  const user_id = req.session.user?.id;

  try {
    const totalAmount = quantity * price_per_unit;

    const [userRows] = await pool.query('SELECT balance FROM user WHERE id = ?', [user_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userBalance = userRows[0].balance;
    if (userBalance < totalAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const transactionId = uuidv4();
    const transactionTime = new Date();

    // Convert stock_name to uppercase
    const upperCaseStockName = stock_name.toUpperCase();

    await pool.query(
      'INSERT INTO stock_transaction (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transactionId, user_id, upperCaseStockName, quantity, totalAmount, 'BUY', transactionTime]
    );

    await pool.query('UPDATE user SET balance = balance - ? WHERE id = ?', [totalAmount, user_id]);

    // Check if the stock already exists in shareholding
    const [existingRows] = await pool.query(
      'SELECT shares FROM shareholding WHERE user_id = ? AND stock_name = ?',
      [user_id, upperCaseStockName]
    );

    if (existingRows.length > 0) {
      // Update the existing record
      const newQuantity = existingRows[0].shares + quantity;
      await pool.query(
        'UPDATE shareholding SET shares = ? WHERE user_id = ? AND stock_name = ?',
        [newQuantity, user_id, upperCaseStockName]
      );
    } else {
      // Insert a new record
      await pool.query(
        'INSERT INTO shareholding (id, user_id, stock_name, shares) VALUES (UUID(), ?, ?, ?)',
        [user_id, upperCaseStockName, quantity]
      );
    }

    res.status(201).json({ message: 'Stock bought successfully' });
  } catch (error) {
    console.error('Error buying stock:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.post('/sell', ensureAuthenticated, async (req, res) => {
  const { stock_name, quantity, price_per_unit } = req.body;
  const user_id = req.session.user?.id;

  try {
    // Convert stock_name to uppercase
    const upperCaseStockName = stock_name.toUpperCase();

    const [inventoryRows] = await pool.query(
      'SELECT shares FROM shareholding WHERE user_id = ? AND stock_name = ?',
      [user_id, upperCaseStockName]
    );

    if (inventoryRows.length === 0 || inventoryRows[0].shares < quantity) {
      return res.status(400).json({ error: 'Insufficient stock quantity' });
    }

    const totalAmount = quantity * price_per_unit;
    const transactionId = uuidv4();
    const transactionTime = new Date();

    await pool.query(
      'INSERT INTO stock_transaction (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transactionId, user_id, upperCaseStockName, -quantity, totalAmount, 'SELL', transactionTime]
    );

    await pool.query('UPDATE user SET balance = balance + ? WHERE id = ?', [totalAmount, user_id]);

    // Update the shareholding table
    const newQuantity = inventoryRows[0].shares - quantity;
    if (newQuantity > 0) {
      // Update the existing record
      await pool.query(
        'UPDATE shareholding SET shares = ? WHERE user_id = ? AND stock_name = ?',
        [newQuantity, user_id, upperCaseStockName]
      );
    } else {
      // Delete the record if the quantity becomes 0 or less
      await pool.query(
        'DELETE FROM shareholding WHERE user_id = ? AND stock_name = ?',
        [user_id, upperCaseStockName]
      );
    }

    res.status(201).json({ message: 'Stock sold successfully' });
  } catch (error) {
    console.error('Error selling stock:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Sell Stock API
// app.post('/sell', ensureAuthenticated, async (req, res) => {
//   const { stock_name, quantity, price_per_unit } = req.body;
//   const user_id = req.session.user?.id;

//   try {
//     const [inventoryRows] = await pool.query(
//       'SELECT SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS current_quantity FROM `stock_transaction` WHERE user_id = ? AND stock_name = ?',
//       [user_id, stock_name]
//     );

//     if (inventoryRows.length === 0) {
//       return res.status(404).json({ error: 'Stock not found' });
//     }

//     const currentQuantity = inventoryRows[0].current_quantity || 0;
//     if (quantity > currentQuantity) {
//       return res.status(400).json({ error: 'Insufficient stock quantity' });
//     }

//     const totalAmount = quantity * price_per_unit;

//     const transactionId = uuidv4();
//     await pool.query(
//       'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
//       [transactionId, user_id, stock_name, quantity, totalAmount, 'SELL']
//     );

//     await pool.query('UPDATE `user` SET balance = balance + ? WHERE id = ?', [totalAmount, user_id]);

//     res.status(201).json({ message: 'Stock sold successfully' });
//   } catch (error) {
//     console.error('Error selling stock:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
// Sell Stock API
// app.post('/sell', ensureAuthenticated, async (req, res) => {
//   const { stock_name, quantity, price_per_unit } = req.body;
//   const user_id = req.session.user?.id;

//   try {
//     const [inventoryRows] = await pool.query(
//       'SELECT SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS current_quantity FROM `stock_transaction` WHERE user_id = ? AND stock_name = ?',
//       [user_id, stock_name]
//     );

//     if (inventoryRows.length === 0) {
//       return res.status(404).json({ error: 'Stock not found' });
//     }

//     const currentQuantity = inventoryRows[0].current_quantity || 0;
//     if (quantity > currentQuantity) {
//       return res.status(400).json({ error: 'Insufficient stock quantity' });
//     }

//     const totalAmount = quantity * price_per_unit;
//     const transactionId = uuidv4();
//     const transactionTime = new Date(); // Get the current date and time

//     await pool.query(
//       'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
//       [transactionId, user_id, stock_name, -quantity, totalAmount, 'SELL', transactionTime]
//     );

//     await pool.query('UPDATE `user` SET balance = balance + ? WHERE id = ?', [totalAmount, user_id]);

//     res.status(201).json({ message: 'Stock sold successfully' });
//   } catch (error) {
//     console.error('Error selling stock:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// Get User Shareholding API
app.get('/shareholding', ensureAuthenticated, async (req, res) => {
  const user_id = req.session.user?.id;

  try {
    const [rows] = await pool.query(
      'SELECT stock_name, shares FROM `shareholding` WHERE user_id = ?',
      [user_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching shareholding:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all transactions
app.get('/transactions', ensureAuthenticated, async (req, res) => {
  console.log("being called");
  const user_id = req.session.user?.id;

  try {
    const [rows] = await pool.query(
      'SELECT transaction_id, stock_name, quantity, total_amount, transaction_type, transaction_time FROM `stock_transaction` WHERE user_id = ? ORDER BY transaction_id DESC',
      [user_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get a specific transaction
app.get('/transactions/:transaction_id', ensureAuthenticated, async (req, res) => {
  const { transaction_id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT transaction_id, stock_name, quantity, total_amount, transaction_type, created_at FROM `stock_transaction` WHERE transaction_id = ?',
      [transaction_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get current session information
app.get('/session', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'No active session' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// import express from 'express';
// import session from 'express-session';
// import { fileURLToPath } from 'url'; // Import fileURLToPath from 'url'
// import { dirname } from 'path'; // Import dirname from 'path'
// import path from 'path'; // Import path
// import { pool, uuidv4 } from './db.js';
// import bcrypt from 'bcryptjs';



// // Convert the URL of the current module to a path
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Initialize Express
// const app = express();
// app.use(express.json()); // To parse JSON bodies

// // Setup session management
// app.use(session({
//   secret: 'your-very-secure-secret', // Replace with your own secret key
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: false } // Set to true if using HTTPS
// }));

// // Middleware to ensure the user is authenticated
// function ensureAuthenticated(req, res, next) {
//   if (req.session.user) {
//     return next(); // User is authenticated, proceed to the next middleware or route handler
//   } else {
//     return res.status(401).json({ error: 'Unauthorized' }); // User is not authenticated
//   }
// }

// // Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));

// // Register a new user
// app.post('/register', async (req, res) => {
//     const { username, email, password } = req.body;
//     const id = uuidv4();
  
//     try {
//       // Hash the password before storing it
//       const hashedPassword = await bcrypt.hash(password, 10);
  
//       // Insert new user with default balance of $100,000 (assuming balance is part of your use case)
//       const [result] = await pool.query(
//         'INSERT INTO `user` (id, username, email, password) VALUES (?, ?, ?, ?)',
//         [id, username, email, hashedPassword]
//       );
//       res.status(201).json({ id, username, email });
//     } catch (error) {
//       console.error('Error registering user:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Login a user
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
  
//     try {
//       // Fetch user by email
//       const [rows] = await pool.query('SELECT id, username, email, password FROM `user` WHERE email = ?', [email]);
      
//       if (rows.length === 0) {
//         return res.status(401).json({ error: 'Invalid email or password' });
//       }
  
//       const user = rows[0];
  
//       // Compare provided password with stored hashed password
//       const isMatch = await bcrypt.compare(password, user.password);
  
//       if (!isMatch) {
//         return res.status(401).json({ error: 'Invalid email or password' });
//       }
  
//       // Save user info in session
//       req.session.user = { id: user.id, username: user.username, email: user.email };

//       // Return user details (exclude password for security)
//       const { password: _, ...userWithoutPassword } = user;
//       res.json(userWithoutPassword);
//     } catch (error) {
//       console.error('Error logging in user:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
// });



// // Serve the dashboard page
// app.get('/dashboard', ensureAuthenticated, (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); // Adjust the path as necessary
// });

// // Logout a user
// app.post('/logout', (req, res) => {
//   if (req.session) {
//     req.session.destroy((err) => {
//       if (err) {
//         console.error('Error destroying session:', err);
//         return res.status(500).json({ error: 'Failed to log out' });
//       }
//       res.status(200).json({ message: 'Logged out successfully' });
//     });
//   } else {
//     res.status(400).json({ error: 'No session to destroy' });
//   }
// });

// // Get all users
// app.get('/users', async (req, res) => {
//   try {
//     const [rows] = await pool.query('SELECT id, username, email FROM `user`');
//     res.json(rows);
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// // Get user data
// app.get('/api/user-data', ensureAuthenticated, async (req, res) => {
//   const user_id = req.session.user?.id;

//   try {
//       // Fetch user info including balance
//       const [userRows] = await pool.query(
//           'SELECT username, email, balance FROM `user` WHERE id = ?',
//           [user_id]
//       );

//       if (userRows.length === 0) {
//           return res.status(404).json({ error: 'User not found' });
//       }

//       // Fetch stock holdings for the user
//       const [stockRows] = await pool.query(
//           'SELECT stock_name, SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS quantity FROM `stock_transaction` WHERE user_id = ? GROUP BY stock_name',
//           [user_id]
//       );

//       res.json({
//           username: userRows[0].username,
//           email: userRows[0].email,
//           balance: userRows[0].balance,
//           stocks: stockRows
//       });
//   } catch (error) {
//       console.error('Error fetching user data:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//   }
// });



// // Get user by ID
// app.get('/users/:id', async (req, res) => {
//   const { id } = req.params;
  
//   try {
//     const [rows] = await pool.query('SELECT id, username, email FROM `user` WHERE id = ?', [id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }
//     res.json(rows[0]);
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Update a user
// app.put('/users/:id', async (req, res) => {
//   const { id } = req.params;
//   const { username, email, password } = req.body;

//   try {
//     // Update user details, include password update if provided
//     let query = 'UPDATE `user` SET username = ?, email = ?';
//     let values = [username, email];
    
//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       query += ', password = ?';
//       values.push(hashedPassword);
//     }
    
//     query += ' WHERE id = ?';
//     values.push(id);
    
//     const [result] = await pool.query(query, values);
    
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }
    
//     res.status(200).json({ id, username, email });
//   } catch (error) {
//     console.error('Error updating user:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Delete a user
// app.delete('/users/:id', async (req, res) => {
//   const { id } = req.params;

//   try {
//     const [result] = await pool.query('DELETE FROM `user` WHERE id = ?', [id]);
    
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }
    
//     res.status(204).send();
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Buy Stock API
// app.post('/buy', ensureAuthenticated, async (req, res) => {
//     const { stock_name, quantity, price_per_unit } = req.body;
//     const user_id = req.session.user?.id; // Fetch user ID from session

//     try {
//         // Calculate total amount
//         const totalAmount = quantity * price_per_unit;

//         // Check user balance
//         // Note: If you have a balance column, include it. If not, this check should be removed.
//         const [userRows] = await pool.query('SELECT balance FROM `user` WHERE id = ?', [user_id]);
//         if (userRows.length === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }
//         const userBalance = userRows[0].balance;
//         if (userBalance < totalAmount) {
//             return res.status(400).json({ error: 'Insufficient balance' });
//         }

//         // Record transaction
//         const transactionId = uuidv4();
//         await pool.query(
//             'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
//             [transactionId, user_id, stock_name, quantity, totalAmount, 'BUY']
//         );

//         // Update user balance
//         await pool.query('UPDATE `user` SET balance = balance - ? WHERE id = ?', [totalAmount, user_id]);

//         res.status(201).json({ message: 'Stock bought successfully' });
//     } catch (error) {
//         console.error('Error buying stock:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Sell Stock API
// app.post('/sell', ensureAuthenticated, async (req, res) => {
//     const { stock_name, quantity, price_per_unit } = req.body;
//     const user_id = req.session.user?.id; // Fetch user ID from session

//     try {
//         // Calculate current stock quantity
//         const [inventoryRows] = await pool.query(
//             'SELECT SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS current_quantity FROM `stock_transaction` WHERE user_id = ? AND stock_name = ?',
//             [user_id, stock_name]
//         );

//         if (inventoryRows.length === 0) {
//             return res.status(404).json({ error: 'Stock not found' });
//         }

//         const currentQuantity = inventoryRows[0].current_quantity || 0;
//         if (quantity > currentQuantity) {
//             return res.status(400).json({ error: 'Insufficient stock quantity' });
//         }

//         // Calculate total amount
//         const totalAmount = quantity * price_per_unit;

//         // Record transaction
//         const transactionId = uuidv4();
//         await pool.query(
//             'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
//             [transactionId, user_id, stock_name, quantity, totalAmount, 'SELL']
//         );

//         // Update user balance
//         await pool.query('UPDATE `user` SET balance = balance + ? WHERE id = ?', [totalAmount, user_id]);

//         res.status(201).json({ message: 'Stock sold successfully' });
//     } catch (error) {
//         console.error('Error selling stock:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.get('/transactions', ensureAuthenticated, async (req, res) => {
//   const user_id = req.session.user?.id; // Fetch user ID from session

//   try {
//       const [rows] = await pool.query(
//           'SELECT transaction_id, stock_name, quantity, total_amount, transaction_type FROM `stock_transaction` WHERE user_id = ? ORDER BY transaction_id DESC',
//           [user_id]
//       );
//       res.json(rows);
//   } catch (error) {
//       console.error('Error fetching transactions:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// // Get a specific transaction
// app.get('/transactions/:transaction_id', ensureAuthenticated, async (req, res) => {
//     const { transaction_id } = req.params;

//     try {
//         const [rows] = await pool.query(
//             'SELECT transaction_id, stock_name, quantity, total_amount, transaction_type, created_at FROM `stock_transaction` WHERE transaction_id = ?',
//             [transaction_id]
//         );

//         if (rows.length === 0) {
//             return res.status(404).json({ error: 'Transaction not found' });
//         }

//         res.json(rows[0]);
//     } catch (error) {
//         console.error('Error fetching transaction:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

//     // Get current session information
//     app.get('/session', (req, res) => {
//         if (req.session.user) {
//             res.json(req.session.user);
//         } else {
//             res.status(401).json({ error: 'No active session' });
//         }
//     });


// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });





// import express from 'express';
// import session from 'express-session';
// import { pool, uuidv4 } from './db.js'; // Ensure file extension is included
// import bcrypt from 'bcryptjs';

// // Initialize Express
// const app = express();
// app.use(express.json()); // To parse JSON bodies

// // Setup session management
// app.use(session({
//   secret: 'your-very-secure-secret', // Replace with your own secret key
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: false } // Set to true if using HTTPS
// }));

// // Middleware to ensure the user is authenticated
// function ensureAuthenticated(req, res, next) {
//   if (req.session.user) {
//     return next(); // User is authenticated, proceed to the next middleware or route handler
//   } else {
//     return res.status(401).json({ error: 'Unauthorized' }); // User is not authenticated
//   }
// }

// // Register a new user
// app.post('/register', async (req, res) => {
//     const { username, email, password } = req.body;
//     const id = uuidv4();
  
//     try {
//       // Hash the password before storing it
//       const hashedPassword = await bcrypt.hash(password, 10);
  
//       // Insert new user with default balance of $100,000
//       const [result] = await pool.query(
//         'INSERT INTO `user` (id, username, email, password, balance) VALUES (?, ?, ?, ?, ?)',
//         [id, username, email, hashedPassword, 100000.00] // Default balance
//       );
//       res.status(201).json({ id, username, email, balance: 100000.00 });
//     } catch (error) {
//       console.error('Error registering user:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Login a user
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
  
//     try {
//       // Fetch user by email
//       const [rows] = await pool.query('SELECT id, username, email, password, balance FROM `user` WHERE email = ?', [email]);
      
//       if (rows.length === 0) {
//         return res.status(401).json({ error: 'Invalid email or password' });
//       }
  
//       const user = rows[0];
  
//       // Compare provided password with stored hashed password
//       const isMatch = await bcrypt.compare(password, user.password);
  
//       if (!isMatch) {
//         return res.status(401).json({ error: 'Invalid email or password' });
//       }
  
//       // Save user info in session
//       req.session.user = { id: user.id, username: user.username, email: user.email, balance: user.balance };

//       // Return user details (exclude password for security)
//       const { password: _, ...userWithoutPassword } = user;
//       res.json(userWithoutPassword);
//     } catch (error) {
//       console.error('Error logging in user:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Logout a user
// app.post('/logout', (req, res) => {
//   if (req.session) {
//     req.session.destroy((err) => {
//       if (err) {
//         console.error('Error destroying session:', err);
//         return res.status(500).json({ error: 'Failed to log out' });
//       }
//       res.status(200).json({ message: 'Logged out successfully' });
//     });
//   } else {
//     res.status(400).json({ error: 'No session to destroy' });
//   }
// });

// // Get all users
// app.get('/users', async (req, res) => {
//   try {
//     const [rows] = await pool.query('SELECT id, username, email, balance FROM `user`');
//     res.json(rows);
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Get user by ID
// app.get('/users/:id', async (req, res) => {
//   const { id } = req.params;
  
//   try {
//     const [rows] = await pool.query('SELECT id, username, email, balance FROM `user` WHERE id = ?', [id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }
//     res.json(rows[0]);
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Update a user
// app.put('/users/:id', async (req, res) => {
//   const { id } = req.params;
//   const { username, email, password, balance } = req.body;

//   try {
//     const [result] = await pool.query(
//       'UPDATE `user` SET username = ?, email = ?, password = ?, balance = ? WHERE id = ?',
//       [username, email, password, balance, id]
//     );
    
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }
    
//     res.status(200).json({ id, username, email, balance });
//   } catch (error) {
//     console.error('Error updating user:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Delete a user
// app.delete('/users/:id', async (req, res) => {
//   const { id } = req.params;

//   try {
//     const [result] = await pool.query('DELETE FROM `user` WHERE id = ?', [id]);
    
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }
    
//     res.status(204).send();
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Buy Stock API
// app.post('/buy', ensureAuthenticated, async (req, res) => {
//     const { stock_name, quantity, price_per_unit } = req.body;
//     const user_id = req.session.user?.id; // Fetch user ID from session

//     try {
//         // Calculate total amount
//         const totalAmount = quantity * price_per_unit;

//         // Check user balance
//         const [userRows] = await pool.query('SELECT balance FROM `user` WHERE id = ?', [user_id]);
//         if (userRows.length === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }
//         const userBalance = userRows[0].balance;
//         if (userBalance < totalAmount) {
//             return res.status(400).json({ error: 'Insufficient balance' });
//         }

//         // Update user balance
//         await pool.query('UPDATE `user` SET balance = balance - ? WHERE id = ?', [totalAmount, user_id]);

//         // Record transaction
//         const transactionId = uuidv4();
//         await pool.query(
//             'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
//             [transactionId, user_id, stock_name, quantity, totalAmount, 'BUY']
//         );

//         res.status(201).json({ message: 'Stock bought successfully' });
//     } catch (error) {
//         console.error('Error buying stock:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Sell Stock API
// app.post('/sell', ensureAuthenticated, async (req, res) => {
//     const { stock_name, quantity, price_per_unit } = req.body;
//     const user_id = req.session.user?.id; // Fetch user ID from session

//     try {
//         // Calculate current stock quantity
//         const [inventoryRows] = await pool.query(
//             'SELECT SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS current_quantity FROM `stock_transaction` WHERE user_id = ? AND stock_name = ?',
//             [user_id, stock_name]
//         );

//         if (inventoryRows.length === 0) {
//             return res.status(404).json({ error: 'Stock not found' });
//         }

//         const currentQuantity = inventoryRows[0].current_quantity || 0;
//         if (quantity > currentQuantity) {
//             return res.status(400).json({ error: 'Insufficient stock quantity' });
//         }

//         // Calculate total amount
//         const totalAmount = quantity * price_per_unit;

//         // Record transaction
//         const transactionId = uuidv4();
//         await pool.query(
//             'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
//             [transactionId, user_id, stock_name, quantity, totalAmount, 'SELL']
//         );

//         // Update user balance
//         await pool.query('UPDATE `user` SET balance = balance + ? WHERE id = ?', [totalAmount, user_id]);

//         res.status(201).json({ message: 'Stock sold successfully' });
//     }  catch (error) {
//             console.error('Error selling stock:', error);
//             res.status(500).json({ error: 'Internal Server Error' });
//         }
//     });
    
//     // Get User Stock Holdings API
//     app.get('/stocks/:user_id', ensureAuthenticated, async (req, res) => {
//         const { user_id } = req.params;
    
//         try {
//             const [rows] = await pool.query(
//                 'SELECT stock_name, SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS quantity FROM `stock_transaction` WHERE user_id = ? GROUP BY stock_name HAVING quantity > 0',
//                 [user_id]
//             );
//             res.json(rows);
//         } catch (error) {
//             console.error('Error fetching user stocks:', error);
//             res.status(500).json({ error: 'Internal Server Error' });
//         }
//     });
    
//     // Get current session information
//     app.get('/session', (req, res) => {
//         if (req.session.user) {
//             res.json(req.session.user);
//         } else {
//             res.status(401).json({ error: 'No active session' });
//         }
//     });
    
//     // Start the server
//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//       console.log(`Server is running on port ${PORT}`);
//     });
    





// // import express from 'express';
// // import session from 'express-session';
// // import { pool, uuidv4 } from './db.js'; // Ensure file extension is included
// // import bcrypt from 'bcryptjs';

// // // Initialize Express
// // const app = express();
// // app.use(express.json()); // To parse JSON bodies

// // // Setup session management
// // app.use(session({
// //   secret: 'your-very-secure-secret', // Replace with your own secret key
// //   resave: false,
// //   saveUninitialized: true,
// //   cookie: { secure: false } // Set to true if using HTTPS
// // }));

// // // Register a new user
// // app.post('/register', async (req, res) => {
// //     const { username, email, password } = req.body;
// //     const id = uuidv4();
  
// //     try {
// //       // Hash the password before storing it
// //       const hashedPassword = await bcrypt.hash(password, 10);
  
// //       // Insert new user with default balance of $100,000
// //       const [result] = await pool.query(
// //         'INSERT INTO `user` (id, username, email, password, balance) VALUES (?, ?, ?, ?, ?)',
// //         [id, username, email, hashedPassword, 100000.00] // Default balance
// //       );
// //       res.status(201).json({ id, username, email, balance: 100000.00 });
// //     } catch (error) {
// //       console.error('Error registering user:', error);
// //       res.status(500).json({ error: 'Internal Server Error' });
// //     }
// // });

// // // Login a user
// // app.post('/login', async (req, res) => {
// //     const { email, password } = req.body;
  
// //     try {
// //       // Fetch user by email
// //       const [rows] = await pool.query('SELECT id, username, email, password, balance FROM `user` WHERE email = ?', [email]);
      
// //       if (rows.length === 0) {
// //         return res.status(401).json({ error: 'Invalid email or password' });
// //       }
  
// //       const user = rows[0];
  
// //       // Compare provided password with stored hashed password
// //       const isMatch = await bcrypt.compare(password, user.password);
  
// //       if (!isMatch) {
// //         return res.status(401).json({ error: 'Invalid email or password' });
// //       }
  
// //       // Save user info in session
// //       req.session.user = { id: user.id, username: user.username, email: user.email, balance: user.balance };

// //       // Return user details (exclude password for security)
// //       const { password: _, ...userWithoutPassword } = user;
// //       res.json(userWithoutPassword);
// //     } catch (error) {
// //       console.error('Error logging in user:', error);
// //       res.status(500).json({ error: 'Internal Server Error' });
// //     }
// // });

// // // Logout a user
// // app.post('/logout', (req, res) => {
// //   if (req.session) {
// //     req.session.destroy((err) => {
// //       if (err) {
// //         console.error('Error destroying session:', err);
// //         return res.status(500).json({ error: 'Failed to log out' });
// //       }
// //       res.status(200).json({ message: 'Logged out successfully' });
// //     });
// //   } else {
// //     res.status(400).json({ error: 'No session to destroy' });
// //   }
// // });

// // // Get all users
// // app.get('/users', async (req, res) => {
// //   try {
// //     const [rows] = await pool.query('SELECT id, username, email, balance FROM `user`');
// //     res.json(rows);
// //   } catch (error) {
// //     console.error('Error fetching users:', error);
// //     res.status(500).json({ error: 'Internal Server Error' });
// //   }
// // });

// // // Get user by ID
// // app.get('/users/:id', async (req, res) => {
// //   const { id } = req.params;
  
// //   try {
// //     const [rows] = await pool.query('SELECT id, username, email, balance FROM `user` WHERE id = ?', [id]);
// //     if (rows.length === 0) {
// //       return res.status(404).json({ error: 'User not found' });
// //     }
// //     res.json(rows[0]);
// //   } catch (error) {
// //     console.error('Error fetching user:', error);
// //     res.status(500).json({ error: 'Internal Server Error' });
// //   }
// // });

// // // Update a user
// // app.put('/users/:id', async (req, res) => {
// //   const { id } = req.params;
// //   const { username, email, password, balance } = req.body;

// //   try {
// //     const [result] = await pool.query(
// //       'UPDATE `user` SET username = ?, email = ?, password = ?, balance = ? WHERE id = ?',
// //       [username, email, password, balance, id]
// //     );
    
// //     if (result.affectedRows === 0) {
// //       return res.status(404).json({ error: 'User not found' });
// //     }
    
// //     res.status(200).json({ id, username, email, balance });
// //   } catch (error) {
// //     console.error('Error updating user:', error);
// //     res.status(500).json({ error: 'Internal Server Error' });
// //   }
// // });

// // // Delete a user
// // app.delete('/users/:id', async (req, res) => {
// //   const { id } = req.params;

// //   try {
// //     const [result] = await pool.query('DELETE FROM `user` WHERE id = ?', [id]);
    
// //     if (result.affectedRows === 0) {
// //       return res.status(404).json({ error: 'User not found' });
// //     }
    
// //     res.status(204).send();
// //   } catch (error) {
// //     console.error('Error deleting user:', error);
// //     res.status(500).json({ error: 'Internal Server Error' });
// //   }
// // });

// // /////////////////stock

  
// // app.post('/buy', async (req, res) => {
// //     const { user_id, stock_name, quantity, price_per_unit } = req.body;

// //     try {
// //         // Calculate total amount
// //         const totalAmount = quantity * price_per_unit;

// //         // Check user balance
// //         const [userRows] = await pool.query('SELECT balance FROM `user` WHERE id = ?', [user_id]);
// //         if (userRows.length === 0) {
// //             return res.status(404).json({ error: 'User not found' });
// //         }
// //         const userBalance = userRows[0].balance;
// //         if (userBalance < totalAmount) {
// //             return res.status(400).json({ error: 'Insufficient balance' });
// //         }

// //         // Update user balance
// //         await pool.query('UPDATE `user` SET balance = balance - ? WHERE id = ?', [totalAmount, user_id]);

// //         // Record transaction
// //         const transactionId = uuidv4();
// //         await pool.query(
// //             'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
// //             [transactionId, user_id, stock_name, quantity, totalAmount, 'BUY']
// //         );

// //         res.status(201).json({ message: 'Stock bought successfully' });
// //     } catch (error) {
// //         console.error('Error buying stock:', error);
// //         res.status(500).json({ error: 'Internal Server Error' });
// //     }
// // });

// // app.post('/sell', async (req, res) => {
// //     const { user_id, stock_name, quantity, price_per_unit } = req.body;

// //     try {
// //         // Calculate current stock quantity
// //         const [inventoryRows] = await pool.query(
// //             'SELECT SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS current_quantity FROM `stock_transaction` WHERE user_id = ? AND stock_name = ?',
// //             [user_id, stock_name]
// //         );

// //         if (inventoryRows.length === 0) {
// //             return res.status(404).json({ error: 'Stock not found' });
// //         }

// //         const currentQuantity = inventoryRows[0].current_quantity || 0;
// //         if (quantity > currentQuantity) {
// //             return res.status(400).json({ error: 'Insufficient stock quantity' });
// //         }

// //         // Calculate total amount
// //         const totalAmount = quantity * price_per_unit;

// //         // Record transaction
// //         const transactionId = uuidv4();
// //         await pool.query(
// //             'INSERT INTO `stock_transaction` (transaction_id, user_id, stock_name, quantity, total_amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?)',
// //             [transactionId, user_id, stock_name, quantity, totalAmount, 'SELL']
// //         );

// //         // Update user balance
// //         await pool.query('UPDATE `user` SET balance = balance + ? WHERE id = ?', [totalAmount, user_id]);

// //         res.status(201).json({ message: 'Stock sold successfully' });
// //     } catch (error) {
// //         console.error('Error selling stock:', error);
// //         res.status(500).json({ error: 'Internal Server Error' });
// //     }
// // });


// // // Get User Stock Holdings API
// // app.get('/stocks/:user_id', async (req, res) => {
// //     const { user_id } = req.params;

// //     try {
// //         const [rows] = await pool.query(
// //             'SELECT stock_name, SUM(CASE WHEN transaction_type = "BUY" THEN quantity ELSE -quantity END) AS quantity FROM `stock_transaction` WHERE user_id = ? GROUP BY stock_name HAVING quantity > 0',
// //             [user_id]
// //         );
// //         res.json(rows);
// //     } catch (error) {
// //         console.error('Error fetching user stocks:', error);
// //         res.status(500).json({ error: 'Internal Server Error' });
// //     }
// // });

// //   app.get('/session', async(req, res)=> {
    
// //     const userId = req.session.user?.id; // Assume user ID is stored in the session
// //     console.log(userId)
// //   })

// // // Start the server
// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, () => {
// //   console.log(`Server is running on port ${PORT}`);
// // });
