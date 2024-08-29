// src/components/DashboardCard.js
import React from 'react';
import { Card } from 'antd';

const DashboardCard = ({ title, value }) => {
  return (
    <Card>
      <h3>{title}</h3>
      <p style={{ fontSize: '24px', margin: 0 }}>{value}</p>
    </Card>
  );
};

export default DashboardCard;
