import React from 'react';
import ProductList from '../components/ProductList.jsx';

const Home = () => {
  return (
    <div className="home-page">
      <h1>Bem-vindo à nossa loja!</h1>
      <ProductList />
    </div>
  );
};

export default Home;
