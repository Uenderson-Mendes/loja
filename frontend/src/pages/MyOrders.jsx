import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../services/api.jsx';
import './MyOrders.css';

const STATUS_META = {
  all: { label: 'Todos' },
  pending: { label: 'Recebido' },
  processing: { label: 'Preparando' },
  shipped: { label: 'Em rota de entrega' },
  delivered: { label: 'Entregue' },
  cancelled: { label: 'Cancelado' },
};

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const navigate = useNavigate();

  const loadOrders = useCallback(async () => {
    try {
      const response = await getOrders();
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar pedidos do cliente:', error);
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const inProgress = orders.filter((order) => ['pending', 'processing', 'shipped'].includes(order.status)).length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const totalSpent = orders.reduce((acc, order) => acc + Number(order.total_price || 0), 0);

    return { totalOrders, inProgress, delivered, totalSpent };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatch = activeStatus === 'all' || order.status === activeStatus;
      if (!statusMatch) return false;

      if (!query) return true;

      const itemsText = (order.items || [])
        .map((item) => `${item.product_name} ${item.quantity}`)
        .join(' ')
        .toLowerCase();

      const searchContent = [
        String(order.id),
        order.shipping_address,
        STATUS_META[order.status]?.label || order.status,
        new Date(order.created_at).toLocaleDateString('pt-BR'),
        itemsText,
      ]
        .join(' ')
        .toLowerCase();

      return searchContent.includes(query);
    });
  }, [orders, activeStatus, search]);

  const getProgressStep = (status) => {
    if (status === 'cancelled') return -1;
    return STATUS_ORDER.indexOf(status);
  };

  if (loading) {
    return <p>Carregando pedidos...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="my-orders-empty">
        <h2>Voce ainda nao tem pedidos</h2>
        <p>Assim que finalizar uma compra, seus pedidos aparecerao aqui.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Ir para produtos
        </button>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <header className="my-orders-hero">
        <div>
          <h2>Meus Pedidos</h2>
          <p>Acompanhe o status dos seus pedidos e informacoes de entrega.</p>
        </div>
        <button className="btn btn-primary" onClick={loadOrders}>Atualizar</button>
      </header>

      <section className="my-orders-kpis">
        <article className="my-kpi-card">
          <h3>Total de pedidos</h3>
          <p>{stats.totalOrders}</p>
        </article>
        <article className="my-kpi-card">
          <h3>Em andamento</h3>
          <p>{stats.inProgress}</p>
        </article>
        <article className="my-kpi-card">
          <h3>Entregues</h3>
          <p>{stats.delivered}</p>
        </article>
        <article className="my-kpi-card highlight">
          <h3>Total gasto</h3>
          <p>{formatCurrency(stats.totalSpent)}</p>
        </article>
      </section>

      <section className="my-orders-filters">
        <input
          type="text"
          className="my-orders-search"
          placeholder="Buscar por ID, endereco, item ou status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="my-orders-tabs">
          {Object.entries(STATUS_META).map(([statusKey, statusMeta]) => (
            <button
              type="button"
              key={statusKey}
              className={`my-orders-tab ${activeStatus === statusKey ? 'active' : ''}`}
              onClick={() => setActiveStatus(statusKey)}
            >
              {statusMeta.label}
            </button>
          ))}
        </div>
      </section>

      {filteredOrders.length === 0 && (
        <div className="my-orders-empty filtered">
          <h3>Nenhum resultado encontrado</h3>
          <p>Tente mudar os filtros ou o texto da busca.</p>
        </div>
      )}

      {filteredOrders.map((order) => {
        const progressStep = getProgressStep(order.status);
        const totalItems = (order.items || []).reduce((acc, item) => acc + Number(item.quantity || 0), 0);

        return (
          <article key={order.id} className="my-order-card">
            <div className="my-order-header">
              <div>
                <h3>Pedido #{order.id}</h3>
                <small>{new Date(order.created_at).toLocaleString('pt-BR')}</small>
              </div>
              <span className={`my-order-status status-${order.status}`}>
                {STATUS_META[order.status]?.label || order.status}
              </span>
            </div>

            <div className="my-order-progress">
              {order.status === 'cancelled' ? (
                <div className="my-order-cancelled">Pedido cancelado</div>
              ) : (
                STATUS_ORDER.map((status, idx) => (
                  <div key={`${order.id}-${status}`} className={`my-step ${idx <= progressStep ? 'done' : ''}`}>
                    <span className="dot" />
                    <span>{STATUS_META[status]?.label || status}</span>
                  </div>
                ))
              )}
            </div>

            <div className="my-order-meta">
              <div>
                <span>ID</span>
                <strong>#{order.id}</strong>
              </div>
              <div>
                <span>Itens</span>
                <strong>{totalItems}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(order.total_price)}</strong>
              </div>
              <div>
                <span>Atualizado</span>
                <strong>{new Date(order.updated_at).toLocaleString('pt-BR')}</strong>
              </div>
            </div>

            <div className="my-order-address">
              <p><strong>Endereco de entrega</strong></p>
              <p>{order.shipping_address}</p>
            </div>

            <div className="my-order-items">
              <h4>Itens do pedido</h4>
              {(order.items || []).map((item) => (
                <div key={item.id} className="my-order-item-row">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default MyOrders;
