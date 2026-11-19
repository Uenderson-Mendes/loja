import React from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`}>
        {product.image ? (
          <img src={product.image} alt={product.name} className="product-image" />
        ) : (
          <div className="product-image-placeholder">Sem imagem</div>
        )}
      </Link>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">R$ {parseFloat(product.price).toFixed(2)}</p>
        <Link to={`/product/${product.id}`} className="btn-details">
          Ver Detalhes
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
