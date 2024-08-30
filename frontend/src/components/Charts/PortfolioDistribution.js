// src/components/Charts/PortfolioDistribution.js
import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getUserShareholding } from '../../services/api.js';
import axios from 'axios';
import config  from '../../config.js';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA336A', '#AA33AA'];


const getCurrentPrice = async (symbol) => {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol: symbol,
        token: config.FINNHUB_API_KEY,
      },
    });
    return response.data.c; // Return current price
  } catch (error) {
    console.error(`Error fetching current price for ${symbol}:`, error);
    return 0; // Return 0 if there's an error
  }
};

const PortfolioDistribution = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getUserShareholding(); // Fetch user's current share holdings
        const holdings = response.data;

        // Fetch current prices and calculate total value per stock
        const chartData = await Promise.all(
          holdings.map(async (stock) => {
            const currentPrice = await getCurrentPrice(stock.stock_name);
            const totalValue = (currentPrice * stock.shares).toFixed(2);
            return {
              name: stock.stock_name,
              value: parseFloat(totalValue),
            };
          })
        );

        setData(chartData.filter(stock => stock.value > 0)); // Filter out stocks with 0 value
      } catch (error) {
        console.error('Error fetching portfolio distribution:', error);
      }
    };

    fetchData();
  }, []);

  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const total = data.reduce((acc, entry) => acc + entry.value, 0);
      const percentage = ((payload[0].value / total) * 100).toFixed(2);

      const formattedValue= payload[0].value.toFixed(2);
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '5px', border: '1px solid #ccc' }}>
          <p>{`${payload[0].name} : $${parseFloat(formattedValue).toLocaleString()} (${percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card title="Portfolio Distribution">
      <PieChart width={400} height={300}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={renderCustomTooltip} />
        <Legend />
      </PieChart>
    </Card>
  );
};

export default PortfolioDistribution;
