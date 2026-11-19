import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getDashboardMetrics } from '../services/api.jsx';
import './Dashboard.css';

const STATUS_LABELS = {
  pending: 'Pendente',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [productSort, setProductSort] = useState('units_sold');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const userResponse = await getCurrentUser();
      const currentUser = userResponse.data;

      if (!(currentUser.is_staff || currentUser.is_superuser)) {
        // A API também valida proprietário de loja no backend.
      }

      const response = await getDashboardMetrics();
      setDashboardData(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }

      if (err.response?.status === 403) {
        setError('Sem permissão para visualizar o dashboard. Você precisa ser admin ou ter uma loja cadastrada.');
      } else {
        setError('Erro ao carregar dados do dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const timeline = useMemo(() => dashboardData?.sales_timeline || [], [dashboardData]);
  const daysToShow = Number(period);

  const filteredTimeline = useMemo(
    () => timeline.slice(Math.max(timeline.length - daysToShow, 0)),
    [timeline, daysToShow]
  );

  const maxRevenue = useMemo(
    () => Math.max(...filteredTimeline.map((item) => Number(item.revenue || 0)), 1),
    [filteredTimeline]
  );

  const linePoints = useMemo(() => {
    if (filteredTimeline.length === 0) return '';

    const width = 760;
    const height = 220;
    const stepX = filteredTimeline.length > 1 ? width / (filteredTimeline.length - 1) : width;

    return filteredTimeline
      .map((item, idx) => {
        const x = idx * stepX;
        const y = height - (Number(item.revenue || 0) / maxRevenue) * height;
        return `${x},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [filteredTimeline, maxRevenue]);

  const sortedTopProducts = useMemo(() => {
    const products = [...(dashboardData?.top_products || [])];
    return products.sort((a, b) => Number(b[productSort] || 0) - Number(a[productSort] || 0));
  }, [dashboardData?.top_products, productSort]);

  const totalStatusOrders = useMemo(
    () => (dashboardData?.status_distribution || []).reduce((acc, item) => acc + Number(item.count || 0), 0),
    [dashboardData?.status_distribution]
  );

  const maxWeekdayRevenue = useMemo(
    () => Math.max(...(dashboardData?.weekday_sales || []).map((item) => Number(item.revenue || 0)), 1),
    [dashboardData?.weekday_sales]
  );

  if (loading) {
    return <div className="dashboard-state">Carregando dashboard...</div>;
  }

  if (error) {
    return (
      <div className="dashboard-state error">
        <p>{error}</p>
        <button className="dashboard-button" onClick={loadDashboard}>Tentar novamente</button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="dashboard-state">Nenhum dado disponível.</div>;
  }

  const {
    summary,
    business_health,
    cashflow,
    period_comparison,
    stock_by_category,
    low_stock_products,
    unsold_products,
    weekday_sales,
    category_sales,
    recent_orders,
  } = dashboardData;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Controle de Fluxo e Caixa</h1>
          <p>Visão operacional de estoque, vendas e desempenho em tempo real.</p>
        </div>
        <div className="dashboard-actions">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="dashboard-select">
            <option value="7">Últimos 7 dias</option>
            <option value="14">Últimos 14 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
          <button className="dashboard-button" onClick={loadDashboard}>Atualizar</button>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card revenue">
          <h3>Receita Total</h3>
          <p>{formatCurrency(summary.total_revenue)}</p>
          <small>Ticket médio: {formatCurrency(summary.avg_ticket)}</small>
        </article>
        <article className="kpi-card">
          <h3>Pedidos</h3>
          <p>{summary.total_orders}</p>
          <small>Itens vendidos: {summary.total_units_sold}</small>
        </article>
        <article className="kpi-card">
          <h3>Estoque</h3>
          <p>{summary.total_stock_units}</p>
          <small>{summary.total_products} produtos ativos</small>
        </article>
        <article className="kpi-card alert">
          <h3>Risco de Ruptura</h3>
          <p>{summary.low_stock_count}</p>
          <small>Sem estoque: {summary.out_of_stock_count}</small>
        </article>
      </section>

      <section className="kpi-grid kpi-grid-secondary">
        <article className="kpi-card">
          <h3>Valor do Estoque</h3>
          <p>{formatCurrency(business_health.inventory_value)}</p>
          <small>Capital imobilizado</small>
        </article>
        <article className="kpi-card">
          <h3>Clientes Ativos</h3>
          <p>{business_health.active_customers}</p>
          <small>Clientes com pedidos</small>
        </article>
        <article className="kpi-card">
          <h3>Taxa de Entrega</h3>
          <p>{formatPercent(business_health.delivery_rate)}</p>
          <small>Cancelamento: {formatPercent(business_health.cancellation_rate)}</small>
        </article>
        <article className="kpi-card alert-soft">
          <h3>Produtos Sem Giro</h3>
          <p>{business_health.unsold_products_count}</p>
          <small>Sem vendas registradas</small>
        </article>
      </section>

      <section className="cashflow-grid">
        <article className="cashflow-card">
          <h4>Hoje</h4>
          <p>{formatCurrency(cashflow.today.revenue)}</p>
          <span>{cashflow.today.orders} pedidos</span>
        </article>
        <article className="cashflow-card">
          <h4>Últimos 7 dias</h4>
          <p>{formatCurrency(cashflow.last_7_days.revenue)}</p>
          <span>{cashflow.last_7_days.orders} pedidos</span>
        </article>
        <article className="cashflow-card">
          <h4>Últimos 30 dias</h4>
          <p>{formatCurrency(cashflow.last_30_days.revenue)}</p>
          <span>{cashflow.last_30_days.orders} pedidos</span>
        </article>
      </section>

      <section className="dashboard-two-columns">
        <article className="panel">
          <div className="panel-head">
            <h2>Comparativo 30 x 30 Dias</h2>
            <span>crescimento vs período anterior</span>
          </div>
          <div className="comparison-grid">
            <div className="comparison-card">
              <h4>Receita</h4>
              <p>{formatCurrency(period_comparison.current_30_days.revenue)}</p>
              <small>Anterior: {formatCurrency(period_comparison.previous_30_days.revenue)}</small>
              <strong className={Number(period_comparison.growth.revenue_pct) >= 0 ? 'positive' : 'negative'}>
                {Number(period_comparison.growth.revenue_pct) >= 0 ? '+' : ''}
                {formatPercent(period_comparison.growth.revenue_pct)}
              </strong>
            </div>
            <div className="comparison-card">
              <h4>Pedidos</h4>
              <p>{period_comparison.current_30_days.orders}</p>
              <small>Anterior: {period_comparison.previous_30_days.orders}</small>
              <strong className={Number(period_comparison.growth.orders_pct) >= 0 ? 'positive' : 'negative'}>
                {Number(period_comparison.growth.orders_pct) >= 0 ? '+' : ''}
                {formatPercent(period_comparison.growth.orders_pct)}
              </strong>
            </div>
            <div className="comparison-card">
              <h4>Pedidos em Aberto</h4>
              <p>{business_health.pending_orders}</p>
              <small>Cancelados: {business_health.cancelled_orders}</small>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Vendas por Dia da Semana</h2>
            <span>últimos 30 dias</span>
          </div>
          <div className="weekday-list">
            {weekday_sales.map((day) => {
              const width = `${(Number(day.revenue || 0) / maxWeekdayRevenue) * 100}%`;
              return (
                <div key={day.weekday} className="weekday-item">
                  <div className="weekday-head">
                    <strong>{day.label}</strong>
                    <span>{formatCurrency(day.revenue)}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill weekday-fill" style={{ width }} />
                  </div>
                  <small>{day.units_sold} unidades vendidas</small>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="panel chart-panel">
        <div className="panel-head">
          <h2>Fluxo de Caixa Diário</h2>
          <span>Receita por dia ({period} dias)</span>
        </div>
        <div className="line-chart-wrapper">
          <svg viewBox="0 0 760 250" className="line-chart" preserveAspectRatio="none">
            <polyline
              points={linePoints}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="line-labels">
            {filteredTimeline.map((item, idx) => (
              <div key={`${item.day}-${idx}`} className="line-label-item">
                <span>{formatDate(item.day)}</span>
                <strong>{formatCurrency(item.revenue)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-two-columns">
        <article className="panel">
          <div className="panel-head">
            <h2>Produtos Mais Vendidos</h2>
            <select
              value={productSort}
              onChange={(e) => setProductSort(e.target.value)}
              className="dashboard-select small"
            >
              <option value="units_sold">Ordenar por quantidade</option>
              <option value="revenue">Ordenar por receita</option>
              <option value="orders_count">Ordenar por pedidos</option>
            </select>
          </div>
          <div className="top-products-list">
            {sortedTopProducts.map((product) => {
              const maxUnits = Math.max(...sortedTopProducts.map((item) => Number(item.units_sold || 0)), 1);
              const width = `${(Number(product.units_sold || 0) / maxUnits) * 100}%`;

              return (
                <div key={`${product.product_id || product.product_name}`} className="top-product-item">
                  <div className="top-product-head">
                    <strong>{product.product_name}</strong>
                    <span>{product.units_sold} un.</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width }} />
                  </div>
                  <div className="top-product-metrics">
                    <span>Receita: {formatCurrency(product.revenue)}</span>
                    <span>Pedidos: {product.orders_count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Distribuição de Status</h2>
            <span>{totalStatusOrders} pedidos no total</span>
          </div>
          <div className="status-list">
            {(dashboardData.status_distribution || []).map((statusItem) => {
              const percent = totalStatusOrders ? (Number(statusItem.count) / totalStatusOrders) * 100 : 0;
              return (
                <div key={statusItem.status} className="status-item">
                  <div className="status-label-row">
                    <strong>{STATUS_LABELS[statusItem.status] || statusItem.status}</strong>
                    <span>{statusItem.count} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="bar-track status-track">
                    <div className="bar-fill status-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="dashboard-two-columns">
        <article className="panel">
          <div className="panel-head">
            <h2>Categorias Mais Rentáveis</h2>
            <span>por faturamento</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Receita</th>
                  <th>Unidades</th>
                </tr>
              </thead>
              <tbody>
                {category_sales.length === 0 && (
                  <tr>
                    <td colSpan="3">Sem vendas para o período.</td>
                  </tr>
                )}
                {category_sales.map((item, idx) => (
                  <tr key={`${item.product__category__name || 'sem'}-${idx}`}>
                    <td>{item.product__category__name || 'Sem categoria'}</td>
                    <td>{formatCurrency(item.revenue)}</td>
                    <td>{item.units_sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Produtos Sem Giro</h2>
            <span>sem vendas históricas</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque</th>
                  <th>Preço</th>
                </tr>
              </thead>
              <tbody>
                {unsold_products.length === 0 && (
                  <tr>
                    <td colSpan="3">Todos os produtos já tiveram venda.</td>
                  </tr>
                )}
                {unsold_products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>{formatCurrency(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="dashboard-two-columns">
        <article className="panel">
          <div className="panel-head">
            <h2>Estoque por Categoria</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Produtos</th>
                  <th>Estoque</th>
                  <th>Preço Médio</th>
                </tr>
              </thead>
              <tbody>
                {stock_by_category.map((item) => (
                  <tr key={item.category__name || 'sem-categoria'}>
                    <td>{item.category__name || 'Sem categoria'}</td>
                    <td>{item.products_count}</td>
                    <td>{item.total_stock}</td>
                    <td>{formatCurrency(item.avg_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Alertas de Estoque Baixo</h2>
            <span>até 5 unidades</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque</th>
                  <th>Preço</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {low_stock_products.length === 0 && (
                  <tr>
                    <td colSpan="4">Nenhum produto em nível crítico.</td>
                  </tr>
                )}
                {low_stock_products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{item.available ? 'Ativo' : 'Indisponível'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Pedidos Recentes</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Status</th>
                <th>Total</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recent_orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{STATUS_LABELS[order.status] || order.status}</td>
                  <td>{formatCurrency(order.total_price)}</td>
                  <td>{new Date(order.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
