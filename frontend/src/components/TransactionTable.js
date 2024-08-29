// src/components/TransactionTable.js
import React, { useEffect, useState } from 'react';
import { Table, Card } from 'antd';
import { getStockTransactions } from '../services/api.js';
import moment from 'moment';

const TransactionTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await getStockTransactions();
        setTransactions(response.data); // Store transactions in state
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false); // Stop loading indicator
      }
    };

    fetchTransactions(); // Fetch transactions on component mount
  }, []);

  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'transaction_id',
      key: 'transaction_id',
      ellipsis: true,
    },
    {
      title: 'Stock Name',
      dataIndex: 'stock_name',
      key: 'stock_name',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (text) => `$${parseFloat(text).toLocaleString()}`,
    },
    {
      title: 'Transaction Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
    },
    {
      title: 'Transaction Time',  // Update the title to reflect what this column represents
      dataIndex: 'transaction_time',  // Match this with the database field name
      key: 'transaction_time',
      render: (text) => moment(text).format('MMMM Do YYYY, h:mm:ss a'),  // Correctly format the time
    },
  ];

  return (
    <Card title="Recent Transactions">
      <Table
        dataSource={transactions}
        columns={columns}
        rowKey="transaction_id"
        loading={loading}
        pagination={{ pageSize: 10 }} // Pagination settings
      />
    </Card>
  );
};

export default TransactionTable;
