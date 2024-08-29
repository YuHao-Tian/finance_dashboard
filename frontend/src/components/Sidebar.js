// src/components/Sidebar.js
import React from 'react';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  TransactionOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      style={{ height: '100%', borderRight: 0 }}
    >
      <Menu.Item key="/" icon={<DashboardOutlined />}>
        <Link to="/">Dashboard</Link>
      </Menu.Item>
      <Menu.Item key="/transactions" icon={<TransactionOutlined />}>
        <Link to="/transactions">Transactions</Link>
      </Menu.Item>
      <Menu.Item key="/reports" icon={<PieChartOutlined />}>
        <Link to="/reports">Reports</Link>
      </Menu.Item>
    </Menu>
  );
};

export default Sidebar;
