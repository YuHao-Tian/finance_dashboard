// src/components/Charts/BuySellChart.js
import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getStockTransactions } from '../../services/api.js';
import moment from 'moment';

const BuySellChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getStockTransactions();
        const transactions = response.data;

        // Aggregate data by month
        const aggregated = transactions.reduce((acc, curr) => {
          const month = moment(curr.date).format('MMM YYYY'); // Assuming 'date' field exists
          if (!acc[month]) {
            acc[month] = { month, BUY: 0, SELL: 0 };
          }
          acc[month][curr.transaction_type] += parseFloat(curr.total_amount);
          return acc;
        }, {});

        setData(Object.values(aggregated));
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Card title="Buy/Sell Transactions">
      <BarChart width={500} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="BUY" fill="#82ca9d" />
        <Bar dataKey="SELL" fill="#8884d8" />
      </BarChart>
    </Card>
  );
};

export default BuySellChart;
