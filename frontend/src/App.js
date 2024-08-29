import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from 'antd'; // Import Layout from Ant Design
import Navbar from './components/Navbar.js';
import Dashboard from './pages/Dashboard.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import UserProfile from './pages/UserProfile.js'; // Import the UserProfile component
import './App.css'; // Make sure to include your custom CSS

const { Content, Footer } = Layout;

function App() {
  return (
    <BrowserRouter>
      <Layout className="main-layout">
        <Navbar />
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to='/login' />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<UserProfile />} />
          </Routes>
        </Content>
        <Footer className="app-footer">
          <div className="footer-content">
            <span>© 2024 Financial Dashboard</span>
            <span>|</span>
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Service</span>
          </div>
        </Footer>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
