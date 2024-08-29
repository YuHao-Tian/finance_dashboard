import React, { useContext } from 'react';
import { Layout, Button, Menu, Dropdown } from 'antd';
import { LineChartOutlined, UserOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.js';
import './Navbar.css'; // Custom CSS file for additional styling

const { Header } = Layout;

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation(); // Get the current route
  const navigate = useNavigate(); // Use navigate for programmatic navigation

  const handleMenuClick = (e) => {
    if (e.key === 'profile') {
      navigate('/profile');
    } else if (e.key === 'dashboard') {
      navigate('/dashboard');
    } else if (e.key === 'logout') {
      logout();
      sessionStorage.clear();
      navigate('/login');
    }
  };

  const dashboardMenu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Portfolio
      </Menu.Item>
      <Menu.Item key="logout" icon={<DollarCircleOutlined />}>
        Logout
      </Menu.Item>
    </Menu>
  );

  const profileMenu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="dashboard" icon={<LineChartOutlined />}>
        Dashboard
      </Menu.Item>
      <Menu.Item key="logout" icon={<DollarCircleOutlined />}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Header className="navbar-header">
      <div className="navbar-title">
        <DollarCircleOutlined className="navbar-icon" />
        <span>Financial Dashboard</span>
      </div>
      <div className="navbar-menu">
        {user && (
          <>
            <span className="navbar-username">
              {user.username}
            </span>
            <Button type="primary" onClick={logout} className="navbar-logout">
              Logout
            </Button>
          </>
        )}
        {(location.pathname === '/dashboard' || location.pathname === '/profile') && (
          <Dropdown overlay={location.pathname === '/dashboard' ? dashboardMenu : profileMenu} trigger={['click']}>
            <UserOutlined className="navbar-user-icon" />
          </Dropdown>
        )}
      </div>
    </Header>
  );
};

export default Navbar;
