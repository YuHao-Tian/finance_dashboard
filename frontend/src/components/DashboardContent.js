import React, { useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import DashboardCard from './DashboardCard.js';
import StockHoldingChart from './Charts/StockHoldingChart.js';
import PortfolioDistribution from './Charts/PortfolioDistribution.js';
import TransactionTable from './TransactionTable.js';
import axios from 'axios';

const DashboardContent = () => {
  const [userData, setUserData] = useState({
    balance: 0,
    netProfit: 0,
    holdings: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/user-data', { withCredentials: true });
        const data = response.data;
        console.log(data);
    
        const stockPriceRequests = data.holdings.map(async (holding) => {
          try {
            const priceResponse = await axios.get(`https://www.alphavantage.co/query`, {
              params: {
                function: 'GLOBAL_QUOTE',
                symbol: holding.stock_name,
                apikey: 'OQUR3JNFQT4HXQL3', // Replace with your actual API key
              },
            });
    
            const priceData = priceResponse.data['Global Quote'];
            const currentPrice = priceData ? parseFloat(priceData['05. price']) : null;
    
            if (currentPrice === null) {
              console.warn(`Unable to fetch current price for ${holding.stock_name}`);
              return {
                stock_name: holding.stock_name,
                shares: holding.shares,
                current_price: 1000,
              };
            }
    
            return {
              stock_name: holding.stock_name,
              shares: holding.shares,
              current_price: currentPrice,
            };
          } catch (error) {
            console.error(`Error fetching price for ${holding.stock_name}:`, error);
            return {
              stock_name: holding.stock_name,
              shares: holding.shares,
              current_price: null,
            };
          }
        });
    
        const stockPrices = await Promise.all(stockPriceRequests);
        console.log(stockPrices);
    
        const totalStockValue = stockPrices.reduce((acc, stock) => acc + (stock.current_price ? stock.current_price * stock.shares : 0), 0);
        const currentBalance = data.balance || 0;
        const initialBalance = 100000;
        const netProfit = +currentBalance + totalStockValue - initialBalance;
        console.log()
        setUserData({
          balance: currentBalance,
          Yield: ((((+currentBalance + totalStockValue) / initialBalance) - 1) * 100).toFixed(2), // Calculate yield rate
          ER: ((totalStockValue / (+currentBalance + totalStockValue)) * 100).toFixed(2),
          netProfit: netProfit.toFixed(2),
          holdings: stockPrices,
        });
    
      } catch (error) {
        setError('Failed to fetch user data.');
      } finally {
        setLoading(false);
      }
      
    };
    fetchData();
    
  }, []);


  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <DashboardCard title="Balance" value={`$${userData.balance}`}/>
        </Col>
        <Col span={6}>
  <DashboardCard title="Yield Rate" value={`${userData.Yield}%`} />
</Col>

        <Col span={6}>
          <DashboardCard title="Equity Ratio" value={`${userData.ER}%`} />
        </Col>
        <Col span={6}>
          <DashboardCard title="Net Profit" value={`$${userData.netProfit}`} />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: '20px' }}>
        <Col span={12}>
          <StockHoldingChart />
        </Col>
        <Col span={12}>
          <PortfolioDistribution />
        </Col>
      </Row>

      <Row style={{ marginTop: '20px' }}>
        <Col span={24}>
          <TransactionTable />
        </Col>
      </Row>
    </div>
  );
};

export default DashboardContent;