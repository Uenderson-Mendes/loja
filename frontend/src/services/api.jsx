import axios from 'axios';



const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          
          localStorage.setItem('access_token', response.data.access);
          api.defaults.headers.Authorization = `Bearer ${response.data.access}`;
          
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth
export const login = (username, password) =>
  axios.post(`${API_URL}/token/`, { username, password });

export const register = (userData) =>
  axios.post(`${API_URL}/users/register/`, userData);

export const getCurrentUser = () => api.get('/users/me/');

// Products
export const getProducts = (params = {}) => api.get('/store/products/', { params });

export const getProduct = (id) => api.get(`/store/products/${id}/`);

export const createProduct = (data) => api.post('/store/products/', data);

export const updateProduct = (id, data) => api.put(`/store/products/${id}/`, data);

export const deleteProduct = (id) => api.delete(`/store/products/${id}/`);

// Categories
export const getCategories = (params = {}) => api.get('/store/categories/', { params });

export const createCategory = (data) => api.post('/store/categories/', data);

// Cart
export const getCart = () => api.get('/store/cart/');

export const addToCart = (product_id, quantity = 1) =>
  api.post('/store/cart/add_item/', { product_id, quantity });

export const updateCartItem = (item_id, quantity) =>
  api.post('/store/cart/update_item/', { item_id, quantity });

export const removeFromCart = (item_id) =>
  api.post('/store/cart/remove_item/', { item_id });

export const clearCart = () => api.post('/store/cart/clear/');

// Orders
export const getOrders = () => api.get('/store/orders/');

export const createOrder = (shipping_address) =>
  api.post('/store/orders/', { shipping_address });

export const getOrder = (id) => api.get(`/store/orders/${id}/`);
export const getStoreOrders = () => api.get('/store/orders/store-orders/');
export const updateStoreOrderStatus = (orderId, status) =>
  api.patch(`/store/orders/${orderId}/store-status/`, { status });

export const getDashboardMetrics = () => api.get('/store/orders/dashboard/');

export default api;
