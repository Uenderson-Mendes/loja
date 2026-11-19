import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeFromCart, createOrder } from '../services/api.jsx';
import './Cart.css';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const response = await getCart();
      setCart(response.data);
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      const response = await updateCartItem(itemId, newQuantity);
      setCart(response.data);
      
      // Recarregar carrinho para garantir atualização
      await loadCart();
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      setMessage('Erro ao atualizar quantidade');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const response = await removeFromCart(itemId);
      setCart(response.data);
      setMessage('Item removido do carrinho');
      setTimeout(() => setMessage(''), 2000);
      
      // Recarregar carrinho para garantir atualização
      await loadCart();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      setMessage('Erro ao remover item');
    }
  };

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      setMessage('Por favor, insira o endereço de entrega');
      return;
    }

    try {
      await createOrder(shippingAddress);
      setMessage('Pedido realizado com sucesso!');
      setTimeout(() => {
        navigate('/my-orders');
      }, 1500);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setMessage('Erro ao criar pedido');
    }
  };

  if (loading) return <p>Carregando carrinho...</p>;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Carrinho Vazio</h2>
        <p>Adicione produtos ao seu carrinho para continuar.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Ver Produtos
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>Meu Carrinho</h2>
      
      <div className="cart-items">
        {cart.items.map((item) => (
          <div key={item.id} className="cart-item">
            {item.product_image && (
              <img src={item.product_image} alt={item.product_name} className="cart-item-image" />
            )}
            <div className="cart-item-info">
              <h3>{item.product_name}</h3>
              <p className="price">R$ {parseFloat(item.product_price).toFixed(2)}</p>
            </div>
            <div className="cart-item-quantity">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
              />
            </div>
            <div className="cart-item-subtotal">
              <p>R$ {parseFloat(item.subtotal).toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleRemoveItem(item.id)}
              className="btn btn-danger"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h3>Resumo do Pedido</h3>
        <p>Total de itens: {cart.total_items}</p>
        <p className="total">Total: R$ {parseFloat(cart.total_price).toFixed(2)}</p>
        
        <div className="checkout-form">
          <h3>Finalizar Compra</h3>
          <textarea
            placeholder="Endereço de entrega completo"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows="4"
            className="form-control"
          />
          <button onClick={handleCheckout} className="btn btn-success">
            Finalizar Pedido
          </button>
        </div>
        
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default Cart;
