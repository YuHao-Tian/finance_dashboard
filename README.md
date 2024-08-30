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
  
To start this project, you have to cd into /backend and /frontend and run npm start firstly.  
  
The backend end part is started by running node app.js, and it is running on port 3000(by default).
  
The front end part is started by running npm start, and it is running on port 3002.

You have to request your own Finnhub api and Apache Vantage vpi for fetching real market data.  
For Finnhub api: https://finnhub.io/dashboard  
For Apache Vantage api: https://www.alphavantage.co/support/#api-key  
