import React, { useState, useEffect } from 'react';
import { Input, Button, Modal, InputNumber, Card, Row,Col } from 'antd';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'chart.js/auto';

const { Meta } = Card;

const Dashboard = () => {
  const [stockName, setStockName] = useState('');
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], data: [], smaData: [] });
  const [currentPrice, setCurrentPrice] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null); // State to hold company information
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [shares, setShares] = useState(1);
  const navigate = useNavigate();

  if(!sessionStorage.getItem('id')){
    return <Navigate to="/login" />;
  }

  const fetchStockData = async (symbol) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch stock price data
      const stockResponse = await axios.get(
        `https://www.alphavantage.co/query`,
        {
          params: {
            function: 'TIME_SERIES_INTRADAY',
            symbol: symbol,
            interval: '5min',
            apikey: 'B6J4GUNEMTGS0IM5', // Replace with your actual API key
          },
        }
      );

      console.log(stockResponse)
      const timeSeries = stockResponse.data['Time Series (5min)'];

      if (!timeSeries) {
        throw new Error('No data found for this symbol');
      }

      const labels = [];
      const data = [];
      let latestPrice = null;

      for (const timestamp in timeSeries) {
        if (timeSeries.hasOwnProperty(timestamp)) {
          labels.push(new Date(timestamp).toLocaleTimeString());
          const price = parseFloat(timeSeries[timestamp]['4. close']);
          data.push(price);
          if (!latestPrice) {
            latestPrice = price; // Capture the latest price from the most recent timestamp
          }
        }
      }

      labels.reverse();
      data.reverse();
      

      const smaData = calculateMovingAverage(data, 5);

      setChartData({ labels, data, smaData });
      setCurrentPrice(latestPrice); // Set the current stock price

      // Fetch company information from Finnhub
      const companyResponse = await axios.get(
        `https://finnhub.io/api/v1/stock/profile2`,
        {
          params: {
            symbol: symbol,
            token: 'cr5un8hr01qgfrnluivgcr5un8hr01qgfrnluj00', // Replace with your actual Finnhub API key
          },
        }
      );

      setCompanyInfo(companyResponse.data); // Set the company information

      const basicFinancialsData = await fetchBasicFinancials(symbol);
      setBasicFinancials(basicFinancialsData);

      const recommendationResponse = await axios.get(
        `https://finnhub.io/api/v1/stock/recommendation`,
        {
          params: {
            symbol: symbol,
            token: 'cr5un8hr01qgfrnluivgcr5un8hr01qgfrnluj00',
          },
        }
      );

      setRecommendationTrends(recommendationResponse.data.slice(0, 6));

      
    } catch (error) {
      setError('Failed to fetch stock data. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!stockName.trim()) {
      setError('Please enter a stock symbol to search.');
      return;
    }
    setError(null);
    fetchStockData(stockName);
  };

  useEffect(() => {
    if (chartData.labels.length === 0 || chartData.data.length === 0) {
      return;
    }

    if (chart) {
      chart.destroy();
    }

    const newChart = new Chart(document.getElementById('acquisitions'), {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: `${stockName} Stock Price`,
            data: chartData.data,
            fill: false,
            borderColor: 'rgba(75,192,192,1)',
            tension: 0.1,
          },
          {
            label: `${stockName} 5-Period SMA`,
            data: chartData.smaData,
            fill: false,
            borderColor: 'rgba(255,99,132,1)',
            borderDash: [5, 5],
            tension: 0.1,
          },
        ],
      },
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Price (USD)',
            },
          },
        },
      },
    });

    setChart(newChart);
  }, [chartData]);

  const calculateMovingAverage = (data, period) => {
    let movingAverage = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        movingAverage.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
        movingAverage.push(sum / period);
      }
    }
    return movingAverage;
  };

  const handleBuyClick = () => {
    setIsBuyModalVisible(true);
  };
  const handleSellClick = () => {
    setIsModalVisible(true);
  };

  const handleBuyModalOk = async () => {
    setLoading(true);
    setIsBuyModalVisible(false);
    try {
      const response = await fetch('http://localhost:3000/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_name: stockName, // 股票名称
        quantity: shares, // 数量
        price_per_unit: currentPrice, // 每单位价格
        }),
        credentials: 'include', // Include credentials (cookies)
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('token', userData.token); // Store token in local storage
        alert("Buy in stock success")
        navigate('/dashboard'); // Redirect to the root path (http://localhost:3002/)
      } else {
        const errorData = await response.json();
        alert(errorData.error)
        setError(errorData.error || 'Login failed. Please try again.');
      }
      
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSellModalOk = async (values) => {
    setIsModalVisible(false);
    try {
      const response = await fetch('http://localhost:3000/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_name: stockName, // 股票名称
        quantity: shares, // 数量
        price_per_unit: currentPrice, // 每单位价格
        }),
        credentials: 'include', // Include credentials (cookies)
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('token', userData.token); // Store token in local storage
        alert("Sell out stock success")
        navigate('/dashboard'); // Redirect to the root path (http://localhost:3002/)
      } else {
        const errorData = await response.json();
        alert(errorData.error)
        setError(errorData.error || 'Login failed. Please try again.');
      }
      
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  
  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleSharesChange = (value) => {
    setShares(value)
  };

  return (
    <div style={{ maxWidth: '1200px', margin: 'auto', padding: '50px' }}>
    <div style={{ display: 'flex', marginBottom: '20px' }}>
      <div style={{ flex: 1, marginRight: '20px' }}>
      <Row gutter={24} style={{ marginBottom: '20px' }}>
        <Col span={18}>
          <Input
            placeholder="Search for a stock (e.g., AAPL)"
            value={stockName}
            onChange={(e) => setStockName(e.target.value)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={6}>
          <Button type="primary" onClick={handleSearch} loading={loading} style={{ width: '100%' }}>
            Search
          </Button>
        </Col>
      </Row>
          {error && <div style={{ color: 'red', marginTop: '20px' }}>{error}</div>}
          

          <h2>{stockName ? `${stockName} Stock Trend` : 'Stock Trend'}</h2>
         
          {currentPrice !== null && (
            
          <>
           <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '20px' }}>
  Current Price: ${currentPrice?.toFixed(2)}
</p>
            <Button
        type="primary"
        style={{
          background: 'linear-gradient(45deg, #32cd32, #7cfc00)',
          borderColor: '#32cd32',
          color: '#fff',
          fontWeight: 'bold',
        }}
        onClick={handleBuyClick}
      >
        Buy
      </Button>
      <Button
        type="primary"
        style={{
          background: 'linear-gradient(45deg, #ff4500, #ff6347)',
          borderColor: '#ff4500',
          color: '#fff',
          fontWeight: 'bold',
          marginLeft: '10px', // Add some spacing between the buttons
        }}
        onClick={handleSellClick}
      >
        Sell
      </Button>
          </>
        )}
          <div style={{ width: '100%', marginTop: '20px' }}>
            <canvas id="acquisitions"></canvas>
          </div>
        </div>
      </div>

      {companyInfo && (
        <div style={{ marginTop: '40px' }}>
          <Card
            title={companyInfo.name}
            style={{ width: '100%' }}
            cover={
              <img
                alt={`${companyInfo.name} logo`}
                src={companyInfo.logo}
                style={{ maxHeight: '150px', objectFit: 'contain', padding: '20px' }}
              />
            }
          >
            <Meta
              description={(
                <div>
                  <p><strong>Country:</strong> {companyInfo.country}</p>
                  <p><strong>Currency:</strong> {companyInfo.currency}</p>
                  <p><strong>Exchange:</strong> {companyInfo.exchange}</p>
                  <p><strong>Industry:</strong> {companyInfo.finnhubIndustry}</p>
                  <p><strong>IPO Date:</strong> {companyInfo.ipo}</p>
                  <p><strong>Market Capitalization:</strong> ${parseInt(companyInfo.marketCapitalization).toLocaleString()}</p>
                  <p><strong>Outstanding Shares:</strong> {companyInfo.shareOutstanding}</p>
                  <p><strong>Ticker:</strong> {companyInfo.ticker}</p>
                  <p><strong>Phone:</strong> {companyInfo.phone}</p>
                  <p><strong>Website:</strong> <a href={companyInfo.weburl} target="_blank" rel="noopener noreferrer">{companyInfo.weburl}</a></p>
                </div>
              )}
            />
          </Card>
        </div>
      )}

      <Modal
        title="Buy Stocks"
        visible={isBuyModalVisible}
        onOk={handleBuyModalOk}
        onCancel={handleModalCancel}
      >
        <p>Current Price: ${currentPrice?.toFixed(2)}</p>
        <p>Enter the number of shares you want to buy:</p>
        <InputNumber
          min={1}
          defaultValue={1}
          onChange={handleSharesChange}
        />
        <p>Total Price: ${(shares * currentPrice).toFixed(2)}</p>
      </Modal>

      <Modal
        title="Sell Stocks"
        visible={isModalVisible}
        onOk={handleSellModalOk}
        onCancel={handleModalCancel}
      >
        <p>Current Price: ${currentPrice?.toFixed(2)}</p>
        <p>Enter the number of shares you want to Sell:</p>
        <InputNumber
          min={1}
          defaultValue={1}
          onChange={handleSharesChange}
        />
        <p>Total Price: ${(shares * currentPrice).toFixed(2)}</p>
      </Modal>
    </div>
  );
};

export default Dashboard;

{!stockName && news.length > 0 && (
    <Row gutter={[24, 24]}>
      {news.map((article, index) => (
        <Col span={12} key={index}>
          <Card
            hoverable
            cover={<img alt="news" src={article.image} style={{ height: '200px', objectFit: 'cover' }} />}
            style={{ borderRadius: '8px', overflow: 'hidden', borderColor: '#e8e8e8' }}
          >
            <Meta
              title={article.headline}
              description={article.summary.length > 100 ? `${article.summary.slice(0, 100)}...` : article.summary}
            />
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '10px', color: '#1890ff' }}>
              Read more
            </a>
          </Card>
        </Col>
      ))}
    </Row>
  )}
