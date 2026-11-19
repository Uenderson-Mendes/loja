import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoreOrders, updateStoreOrderStatus } from '../services/api.jsx';
import './Orders.css';

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

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [soldProducts, setSoldProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [forbiddenMessage, setForbiddenMessage] = useState('');
  const navigate = useNavigate();

  const loadOrders = useCallback(async () => {
    try {
      const response = await getStoreOrders();
      const payload = response.data || {};
      const incomingOrders = Array.isArray(payload.orders) ? payload.orders : [];

      setOrders(incomingOrders);
      setSoldProducts(Array.isArray(payload.sold_products) ? payload.sold_products : []);
      setSummary(payload.summary || null);
      setForbiddenMessage('');

      const initialDrafts = {};
      incomingOrders.forEach((order) => {
        initialDrafts[order.id] = order.status;
      });
      setStatusDrafts(initialDrafts);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }

      if (error.response?.status === 403) {
        setForbiddenMessage('Esta pagina e exclusiva para perfil de loja.');
      } else {
        setForbiddenMessage('Nao foi possivel carregar os pedidos da loja.');
      }

      setOrders([]);
      setSoldProducts([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusLabel = (status) => {
    return STATUS_META[status]?.label || status;
  };

  const orderStats = useMemo(() => {
    const totalOrders = summary?.total_orders ?? orders.length;
    const inProgress = orders.filter((order) => ['pending', 'processing', 'shipped'].includes(order.status)).length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const totalRevenue = summary?.total_revenue ?? orders.reduce((sum, order) => sum + Number(order.total_for_store || 0), 0);

    return { totalOrders, inProgress, delivered, totalRevenue };
  }, [orders, summary]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatch = activeStatus === 'all' || order.status === activeStatus;
      if (!statusMatch) return false;

      if (!normalizedSearch) return true;

      const itemsText = (order.items || [])
        .map((item) => `${item.product_name} ${item.quantity}`)
        .join(' ')
        .toLowerCase();

      const searchableContent = [
        `#${order.id}`,
        String(order.id),
        getStatusLabel(order.status),
        order.customer?.username,
        order.shipping_address,
        new Date(order.created_at).toLocaleDateString('pt-BR'),
        itemsText,
      ]
        .join(' ')
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [orders, activeStatus, search]);

  const getProgressStep = (status) => {
    if (status === 'cancelled') return -1;
    return STATUS_ORDER.indexOf(status);
  };

  const handleUpdateStatus = async (orderId) => {
    const newStatus = statusDrafts[orderId];
    if (!newStatus) return;

    setUpdatingOrderId(orderId);
    try {
      await updateStoreOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      alert('Nao foi possivel atualizar o status do pedido.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) return <p>Carregando pedidos...</p>;

  if (forbiddenMessage) {
    return (
      <div className="orders-empty filtered">
        <h3>Acesso restrito</h3>
        <p>{forbiddenMessage}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <h2>Nenhum Pedido da Loja</h2>
        <p>Quando houver vendas, os pedidos aparecerao aqui para acompanhamento.</p>
        <button onClick={loadOrders} className="btn btn-primary">
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-hero">
        <div>
          <h2>Pedidos da Loja</h2>
          <p>Gerencie o fluxo dos pedidos vendidos e atualize os status de entrega.</p>
        </div>
        <button onClick={loadOrders} className="btn btn-primary orders-refresh">
          Atualizar
        </button>
      </div>

      <section className="orders-kpis">
        <article className="orders-kpi-card">
          <h3>Total de Pedidos</h3>
          <p>{orderStats.totalOrders}</p>
        </article>
        <article className="orders-kpi-card">
          <h3>Em Andamento</h3>
          <p>{orderStats.inProgress}</p>
        </article>
        <article className="orders-kpi-card">
          <h3>Entregues</h3>
          <p>{orderStats.delivered}</p>
        </article>
        <article className="orders-kpi-card highlight">
          <h3>Receita da Loja</h3>
          <p>{formatCurrency(orderStats.totalRevenue)}</p>
        </article>
      </section>

      <section className="orders-filters">
        <div className="orders-search-wrap">
          <input
            type="text"
            placeholder="Buscar por ID, cliente, status, endereco ou item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="orders-search"
          />
        </div>
        <div className="orders-status-tabs">
          {Object.entries(STATUS_META).map(([statusKey, meta]) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setActiveStatus(statusKey)}
              className={`orders-tab ${activeStatus === statusKey ? 'active' : ''}`}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </section>

      {filteredOrders.length === 0 && (
        <div className="orders-empty filtered">
          <h3>Nenhum pedido encontrado</h3>
          <p>Tente ajustar a busca ou alterar o filtro de status.</p>
        </div>
      )}

      {filteredOrders.map((order) => {
        const progressStep = getProgressStep(order.status);
        const totalItems = Number(order.total_items || 0);

        return (
        <div key={order.id} className="order-card">
          <div className="order-header">
            <div>
              <h3>Pedido #{order.id}</h3>
              <small className="order-date">
                Criado em {new Date(order.created_at).toLocaleString('pt-BR')}
              </small>
              <small className="order-date customer-tag">
                Cliente: {order.customer?.username || 'Nao informado'}
              </small>
            </div>
            <span className={`order-status status-${order.status}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="order-progress">
            {order.status === 'cancelled' ? (
              <div className="order-cancelled-tag">Pedido cancelado</div>
            ) : (
              STATUS_ORDER.map((stepStatus, index) => (
                <div
                  key={`${order.id}-${stepStatus}`}
                  className={`progress-step ${index <= progressStep ? 'done' : ''}`}
                >
                  <span className="step-dot" />
                  <span className="step-label">{getStatusLabel(stepStatus)}</span>
                </div>
              ))
            )}
          </div>

          <div className="order-meta-grid">
            <div className="meta-item">
              <span className="meta-label">ID do pedido</span>
              <strong>#{order.id}</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Itens</span>
              <strong>{totalItems} unidade(s)</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Valor total</span>
              <strong>{formatCurrency(order.total_for_store)}</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Ultima atualizacao</span>
              <strong>{new Date(order.updated_at).toLocaleString('pt-BR')}</strong>
            </div>
          </div>

          <div className="order-status-editor">
            <label htmlFor={`status-${order.id}`}>Alterar status</label>
            <select
              id={`status-${order.id}`}
              value={statusDrafts[order.id] || order.status}
              onChange={(e) =>
                setStatusDrafts((prev) => ({
                  ...prev,
                  [order.id]: e.target.value,
                }))
              }
            >
              <option value="pending">Recebido</option>
              <option value="processing">Preparando</option>
              <option value="shipped">Em rota de entrega</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleUpdateStatus(order.id)}
              disabled={updatingOrderId === order.id || (statusDrafts[order.id] || order.status) === order.status}
            >
              {updatingOrderId === order.id ? 'Salvando...' : 'Salvar status'}
            </button>
          </div>

          <div className="order-info">
            <p><strong>Endereco de entrega</strong></p>
            <p className="shipping-address">{order.shipping_address}</p>
          </div>

          <div className="order-items">
            <h4>Itens do Pedido:</h4>
            {order.items.map((item) => (
              <div key={item.id} className="order-item">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )})}

      <section className="orders-sold-products">
        <h3>Produtos Vendidos (Resumo)</h3>
        <div className="sold-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Unidades Vendidas</th>
                <th>Pedidos</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {soldProducts.map((product) => (
                <tr key={product.product_id}>
                  <td>{product.product_name}</td>
                  <td>{product.units_sold}</td>
                  <td>{product.orders_count}</td>
                  <td>{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
              {soldProducts.length === 0 && (
                <tr>
                  <td colSpan="4" className="empty-table-message">Sem produtos vendidos no periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Orders;
