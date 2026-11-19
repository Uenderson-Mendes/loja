import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, getCurrentUser } from '../services/api.jsx';
import api from '../services/api.jsx';
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [hasStore, setHasStore] = useState(false);
  const navigate = useNavigate();

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    console.log('Token encontrado:', !!token);
    if (token) {
      try {
        const response = await getCurrentUser();
        console.log('Dados do usuário:', response.data);
        setUser(response.data);
        await checkUserStore(response.data.id);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    }
  }, []);

  const checkUserStore = async (userId) => {
    try {
      const response = await api.get('/store/stores/');
      // A API retorna paginação com results
      const storesData = response.data.results || response.data;
      const stores = Array.isArray(storesData) ? storesData : [];
      
      console.log('Todas as lojas:', stores);
      console.log('User ID:', userId);
      
      const userStores = stores.filter(store => {
        console.log(`Comparando store.owner (${store.owner}) === userId (${userId}):`, store.owner === userId);
        return store.owner === userId;
      });
      
      console.log('Lojas do usuário:', userStores);
      setHasStore(userStores.length > 0);
      console.log('hasStore definido como:', userStores.length > 0);
    } catch (error) {
      console.error('Erro ao verificar lojas:', error);
      setHasStore(false);
    }
  };

  const loadCart = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await getCart();
        setCartCount(response.data.total_items);
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadCart();
  }, [loadUser, loadCart]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setCartCount(0);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🛒
        </Link>
        
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">Produtos</Link>
          </li>
          
          {user ? (
            <>
              <li className="nav-item">
                <Link to="/cart" className="nav-link">
                  Carrinho {cartCount > 0 && <span className="badge">{cartCount}</span>}
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/my-orders" className="nav-link">Meus Pedidos</Link>
              </li>
              {(user.is_staff || user.is_superuser || hasStore) && (
                <li className="nav-item">
                  <Link to="/orders" className="nav-link nav-link-orders">Pedidos da Loja</Link>
                </li>
              )}
              {(user.is_staff || user.is_superuser || hasStore) && (
                <li className="nav-item">
                  <Link to="/dashboard" className="nav-link">Dashboard</Link>
                </li>
              )}
              {(user.is_staff || user.is_superuser || hasStore) && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link">Gerenciamento de Estoque</Link>
                </li>
              )}
              <li className="nav-item">
                <Link to="/profile" className="nav-link">Perfil</Link>
              </li>
              <li className="nav-item">
                <span className="nav-link">Olá, {user.username}</span>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link btn-logout">
                  Sair
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">Login</Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link">Cadastrar</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
