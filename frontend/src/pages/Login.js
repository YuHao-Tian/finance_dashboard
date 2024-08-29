import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button } from 'antd';
import './Login.css'; // Import the custom CSS

const Login = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        sessionStorage.setItem('id', userData.id);
        navigate('/dashboard');
      } else if (response.status === 401) {
        setError('No User Found');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="login-container">
      <Form onFinish={onFinish} className="login-form">
        <h2>Login</h2>
        <Form.Item
          name="email"
          rules={[{ required: true, message: 'Please input your email!' }]}
        >
          <Input placeholder="Email" className="login-input" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password placeholder="Password" className="login-input" />
        </Form.Item>
        {error && <div className="error-message">{error}</div>}
        <Form.Item className="login-form-buttons" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: '20px' }}>
            Login
          </Button>
          &emsp;&emsp;&emsp;&emsp;
          <Link to="/register">
            <Button type="default">
              Register
            </Button>
          </Link>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Login;
