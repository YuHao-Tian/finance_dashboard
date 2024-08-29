// src/components/Charts/StockHoldingChart.js
import React, { useEffect, useState } from 'react';
import { Card, List, Avatar } from 'antd';
import { getUserShareholding } from '../../services/api.js';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import axios from 'axios';

const FINNHUB_API_KEY = 'cr5un8hr01qgfrnluivgcr5un8hr01qgfrnluj00'; // Replace with your actual API key

const getCompanyLogo = async (symbol) => {
  try {
    const companyResponse = await axios.get(
      `https://finnhub.io/api/v1/stock/profile2`,
      {
        params: {
          symbol: symbol,
          token: FINNHUB_API_KEY,
        },
      }
    );
    return companyResponse.data.logo || 'https://example.com/default-icon.png'; // Fallback to a default icon if no logo is found
  } catch (error) {
    console.error(`Error fetching logo for ${symbol}:`, error);
    return 'https://example.com/default-icon.png'; // Fallback to a default icon in case of error
  }
};

const getPriceChange = async (symbol) => {
  try {
    // Fetch the current price
    const currentPriceResponse = await axios.get(
      `https://finnhub.io/api/v1/quote`,
      {
        params: {
          symbol: symbol,
          token: FINNHUB_API_KEY,
        },
      }
    );

    const currentPrice = currentPriceResponse.data.c; // Current price
    const previousClosePrice = currentPriceResponse.data.pc; // Previous close price

    // Calculate the percentage change
    const priceChangePercent = ((currentPrice - previousClosePrice) / previousClosePrice) * 100;

    return {
      priceChange: priceChangePercent > 0 ? 'up' : 'down',
      pricePercent: priceChangePercent.toFixed(2),
    };
  } catch (error) {
    console.error(`Error fetching price change for ${symbol}:`, error);
    return {
      priceChange: 'down',
      pricePercent: '0.00',
    }; // Fallback in case of error
  }
};

const StockHoldingChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getUserShareholding();
        const portfolio = response.data;

        // Fetch logos and price changes for each stock and prepare data for the chart
        const chartData = await Promise.all(
          portfolio.map(async (stock) => {
            const logo = await getCompanyLogo(stock.stock_name);
            const { priceChange, pricePercent } = await getPriceChange(stock.stock_name);

            return {
              name: stock.stock_name,
              shares: stock.shares,
              icon: logo,
              priceChange: priceChange,
              pricePercent: pricePercent,
            };
          })
        );

        setData(chartData);
      } catch (error) {
        console.error('Error fetching shareholding:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Card title="Your Stock Holdings" style={{ backgroundColor: '#f0f2f5', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar src={item.icon} />}
              title={item.name}
              description={`You hold ${item.shares} shares`}
            />
            <div>
              {item.priceChange === 'up' ? (
                <ArrowUpOutlined style={{ color: 'green' }} />
              ) : (
                <ArrowDownOutlined style={{ color: 'red' }} />
              )}
              <span style={{ marginLeft: 8 }}>
                {item.priceChange === 'up' ? '+' : '-'}
                {item.pricePercent}%
              </span>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default StockHoldingChart;
