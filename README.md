# Finance Dashboard

A full-featured finance dashboard providing users with real-time financial data, portfolio management, and secure user authentication.

## Features

- **Secure User Authentication**: Utilized `UUIDv4` for unique user IDs and `bcrypt` for password hashing to ensure secure storage of user credentials.
- **RESTful API**: Designed and implemented with `Express.js` to handle user authentication, stock transactions, and portfolio management. Session management is secured with `express-session` and cookies.
- **Real-time Financial Data**: Integrated with `Finnhub` and `Alpha Vantage Stock API` to enable stock searches, view market data, and analyze trends.
- **User Portfolio Management**: Built a comprehensive portfolio section displaying asset profitability, stock holdings, and recent transactions, providing users with a clear overview of their investments.
- **Data Management**: Managed data storage with `MySQL`, ensuring efficient handling of user data and real-time updates to balances and shareholdings.
- **Responsive Front-End**: Developed using `React.js`, `Ant Design (Antd)`, and `Material-UI` to create a responsive and user-friendly interface.

## Technologies Used

- **Back-End**: Express.js, UUIDv4, bcrypt, express-session
- **APIs**: Finnhub, Alpha Vantage Stock API
- **Database**: MySQL
- **Front-End**: React.js, Ant Design (Antd), Material-UI

## How to Start

1. **Set Up the Database**:
   - Use the `finance.sql` file to create the `finance` database and the necessary tables: `user`, `stock_transaction`, and `shareholding`.

2. **Backend Setup**:
   - Navigate to the `/backend` directory:
     ```bash
     cd backend
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Start the backend server:
     ```bash
     node app.js
     ```
   - The backend will run on port 3000 by default.

3. **Frontend Setup**:  
   - Provide your **FINNHUB_API_KEY** and **ALPHA_VANTAGE_API_KEY** in `frontend/src/config.js`.
  
   - Navigate to the `/frontend` directory:
     ```bash
     cd frontend
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Start the frontend:
     ```bash
     npm start
     ```
   - The frontend will run on port 3002 by default.

5. **API Keys**:
   - Request your own API keys for fetching real market data:
     - **Finnhub API**: [https://finnhub.io/dashboard](https://finnhub.io/dashboard)
     - **Alpha Vantage API**: [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
   - Add these keys to your `frontend/src/config.js` file to enable real-time financial data fetching.

Now you’re ready to start using the Finance Dashboard! Simply access the frontend via `http://localhost:3002/login` after starting both the backend and frontend.
