import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCategory, getCurrentUser } from '../services/api.jsx';
import api from '../services/api.jsx';
import './AdminPanel.css';

const AdminPanel = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [userStores, setUserStores] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [productImages, setProductImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    store: '',
    stock: '',
    featured: false,
    visible: true,
  });
  
  const [productImage, setProductImage] = useState(null);


  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
  });

  const [newStore, setNewStore] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      setCurrentUser(response.data);
    } catch (error) {
      navigate('/login');
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    try {
      // Adicionar timestamp para forçar bypass do cache
      const timestamp = Date.now();
      
      // Buscar todas as categorias sem paginação
      const categoriesRes = await api.get(`/store/categories/?page_size=1000&_t=${timestamp}`);
      
      const [productsRes, storesRes] = await Promise.all([
        api.get(`/store/products/?_t=${timestamp}`),
        api.get(`/store/stores/?_t=${timestamp}`),
      ]);
      
      // Tratar paginação da API
      const allProducts = Array.isArray(productsRes.data.results) ? productsRes.data.results : Array.isArray(productsRes.data) ? productsRes.data : [];
      const allCategories = Array.isArray(categoriesRes.data.results) ? categoriesRes.data.results : Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const allStores = Array.isArray(storesRes.data.results) ? storesRes.data.results : Array.isArray(storesRes.data) ? storesRes.data : [];
      
      console.log('Produtos carregados:', allProducts);
      console.log('Total de produtos:', allProducts.length);
      console.log('Produtos em destaque:', allProducts.filter(p => p.featured));
      
      setProducts(allProducts);
      setCategories(allCategories);
      setStores(allStores);
      
      // Filtrar lojas do usuário atual
      const userResponse = await getCurrentUser();
      const userId = userResponse.data.id;
      
      console.log('User ID:', userId);
      console.log('All Stores:', allStores);
      
      const userOwnedStores = allStores.filter(store => store.owner === userId);
      
      console.log('User Owned Stores:', userOwnedStores);
      
      setUserStores(userOwnedStores);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    loadData();
  }, [checkAuth, loadData]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    setSuccessMessage('');
    
    try {
      // Validação
      const errors = {};
      if (!newProduct.name.trim()) errors.name = 'Nome é obrigatório';
      if (!newProduct.price || newProduct.price <= 0) errors.price = 'Preço deve ser maior que zero';
      if (!newProduct.stock || newProduct.stock < 0) errors.stock = 'Estoque não pode ser negativo';
      if (!newProduct.category) errors.category = 'Categoria é obrigatória';
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setIsSubmitting(false);
        return;
      }
      
      // Criar FormData para enviar todos os dados e imagens
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('description', newProduct.description);
      formData.append('price', newProduct.price);
      formData.append('category', newProduct.category);
      formData.append('store', userStores[0].id);
      formData.append('stock', newProduct.stock);
      formData.append('available', true);
      formData.append('featured', newProduct.featured);
      if (productImage) {
        formData.append('image', productImage);
      }
      // Adicionar imagens da galeria como images[]
      productImages.forEach((img, idx) => {
        formData.append('images[]', img);
      });

      if (editingProduct) {
        await api.put(`/store/products/${editingProduct.id}/`, formData);
        setSuccessMessage('✓ Produto atualizado com sucesso!');
        setEditingProduct(null);
      } else {
        await api.post('/store/products/', formData);
        setSuccessMessage('✓ Produto criado com sucesso!');
      }
      
      // Recarregar dados imediatamente
      await loadData();
      
      // Aguardar 1.5 segundos para mostrar mensagem de sucesso
      setTimeout(() => {
        setNewProduct({ name: '', description: '', price: '', category: '', stock: '', featured: false });
        setProductImage(null);
        setProductImages([]);
        setImagePreview(null);
        setImagePreviews([]);
        setShowProductForm(false);
        setSuccessMessage('');
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFormErrors({ submit: 'Erro ao salvar produto: ' + errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      featured: product.featured || false,
    });
    setImagePreview(product.image || null);
    setFormErrors({});
    setSuccessMessage('');
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Tem certeza que deseja deletar este produto?')) {
      return;
    }
    try {
      await api.delete(`/store/products/${productId}/`);
      alert('Produto deletado com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      alert('Erro ao deletar produto');
    }
  };

  const handleToggleFeatured = async (product) => {
    setTogglingProductId(product.id);
    try {
      console.log('Alterando featured do produto:', product.id, 'De:', product.featured, 'Para:', !product.featured);
      
      // Usar PATCH ao invés de PUT para atualizar apenas o campo featured
      const response = await api.patch(`/store/products/${product.id}/`, {
        featured: !product.featured
      });

      console.log('Resposta da API:', response.data);

      // Recarregar dados
      await loadData();
      
      alert(`✅ Produto ${!product.featured ? 'adicionado ao' : 'removido do'} slider com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status do produto:', error);
      console.error('Detalhes do erro:', error.response?.data);
      alert('❌ Erro ao alterar status do produto: ' + (error.response?.data?.detail || error.message));
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleToggleVisible = async (product) => {
    setTogglingProductId(product.id);
    try {
      console.log('Alterando visibilidade do produto:', product.id);
      console.log('Valor atual de visible:', product.visible);
      console.log('Novo valor:', !product.visible);
      
      const payload = { visible: !product.visible };
      console.log('Enviando payload:', payload);
      
      // Não definir headers manualmente - deixar o axios usar a configuração padrão
      const response = await api.patch(`/store/products/${product.id}/`, payload);

      console.log('Resposta da API:', response.data);

      // Recarregar dados
      await loadData();
      
      alert(`✅ Produto ${!product.visible ? 'tornado visível' : 'ocultado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar visibilidade do produto:', error);
      console.error('Detalhes completos do erro:', error.response);
      console.error('Data do erro:', error.response?.data);
      
      let errorMsg = 'Erro desconhecido';
      if (error.response?.data) {
        errorMsg = JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert('❌ Erro ao alterar visibilidade: ' + errorMsg);
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setNewProduct({ name: '', description: '', price: '', category: '', stock: '', featured: false });
    setProductImage(null);
    setProductImages([]);
    setImagePreview(null);
    setImagePreviews([]);
    setFormErrors({});
    setSuccessMessage('');
    setShowProductForm(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limitar a 5 imagens
    const remainingSlots = 5 - productImages.length;
    if (files.length > remainingSlots) {
      alert(`⚠️ Você pode adicionar apenas mais ${remainingSlots} ${remainingSlots === 1 ? 'imagem' : 'imagens'}!`);
      e.target.value = '';
      return;
    }
    
    // Adicionar novas imagens às existentes
    const newImages = [...productImages, ...files];
    setProductImages(newImages);
    
    // Criar previews para as novas imagens
    const newPreviews = [...imagePreviews];
    let loadedCount = 0;
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        loadedCount++;
        if (loadedCount === files.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Limpar input
    e.target.value = '';
  };

  const removeAdditionalImage = (index) => {
    const newImages = productImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setProductImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    try {
      await api.post('/store/stores/', newStore);
      alert('Loja criada com sucesso!');
      setNewStore({ name: '', description: '', address: '', phone: '', email: '' });
      setShowStoreForm(false);
      loadData();
    } catch (error) {
      console.error('Erro ao criar loja:', error);
      alert('Erro ao criar loja: ' + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await createCategory(newCategory);
      alert('Categoria criada com sucesso!');
      setNewCategory({ name: '', description: '' });
      setShowCategoryForm(false);
      loadData();
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      alert('Erro ao criar categoria');
    }
  };

  const isAdmin = currentUser?.is_staff || currentUser?.is_superuser;
  const myStoreProducts = userStores.length > 0 
    ? products.filter(p => userStores.some(s => s.id === p.store))
    : [];
  const productsForView = userStores.length > 0 ? myStoreProducts : products;
  const lowStockCount = productsForView.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = productsForView.filter((p) => p.stock === 0).length;
  const featuredCount = productsForView.filter((p) => p.featured).length;
  const hiddenCount = productsForView.filter((p) => p.visible === false).length;
  const filteredStoreProducts = productsForView.filter((product) => {
    const query = productSearch.trim().toLocaleLowerCase('pt-BR');
    const matchesQuery = !query || [product.name, product.category_name, product.store_name]
      .some((value) => value?.toLocaleLowerCase('pt-BR').includes(query));
    const stock = Number(product.stock) || 0;
    const matchesStock = stockFilter === 'all'
      || (stockFilter === 'out' && stock === 0)
      || (stockFilter === 'low' && stock > 0 && stock <= 5)
      || (stockFilter === 'ok' && stock > 5);
    return matchesQuery && matchesStock;
  });

  return (
    <div className="admin-panel">
      <div className="admin-hero">
        <div>
          <h1>Painel de Gerenciamento</h1>
          <p>Bem-vindo, {currentUser?.username}! Gerencie produtos, estoque e visibilidade em um unico lugar.</p>
        </div>
        <div className="admin-user-meta">
          <span>ID: {currentUser?.id}</span>
          <span>{isAdmin ? 'Administrador' : 'Lojista'}</span>
          <span>{userStores.length > 0 ? `${userStores.length} loja(s)` : 'Sem loja vinculada'}</span>
        </div>
      </div>

      <div className="admin-kpis">
        <div className="admin-kpi-card">
          <h3>Produtos</h3>
          <p>{productsForView.length}</p>
        </div>
        <div className="admin-kpi-card">
          <h3>Estoque Baixo</h3>
          <p>{lowStockCount}</p>
        </div>
        <div className="admin-kpi-card danger">
          <h3>Sem Est</h3>
          <p>{outOfStockCount}</p>
        </div>
        <div className="admin-kpi-card highlight">
          <h3>Em Destaque</h3>
          <p>{featuredCount}</p>
          <small>{hiddenCount} oculto(s)</small>
        </div>
      </div>

      {/* Seção de Lojas - Apenas Admin */}
      {isAdmin && (
        <div className="admin-section">
          <div className="admin-header">
            <h2>Lojas</h2>
            <button
              onClick={() => setShowStoreForm(!showStoreForm)}
              className="btn btn-primary"
            >
              {showStoreForm ? 'Cancelar' : 'Nova Loja'}
            </button>
          </div>

          {showStoreForm && (
            <form onSubmit={handleCreateStore} className="admin-form">
              <input
                type="text"
                placeholder="Nome da loja"
                value={newStore.name}
                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Descrição"
                value={newStore.description}
                onChange={(e) => setNewStore({ ...newStore, description: e.target.value })}
              />
              <textarea
                placeholder="Endereço completo"
                value={newStore.address}
                onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Telefone"
                value={newStore.phone}
                onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newStore.email}
                onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                required
              />
              <button type="submit" className="btn btn-success">Criar Loja</button>
            </form>
          )}

          <div className="store-list">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Proprietário</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id}>
                    <td>{store.name}</td>
                    <td>{store.owner_name}</td>
                    <td>{store.phone}</td>
                    <td>{store.email}</td>
                    <td>{store.active ? 'Ativa' : 'Inativa'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seção de Categorias - Apenas Admin */}
      {isAdmin && (
        <div className="admin-section">
          <div className="admin-header">
            <h2>Categorias</h2>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="btn btn-primary"
            >
              {showCategoryForm ? 'Cancelar' : 'Nova Categoria'}
            </button>
          </div>

          {showCategoryForm && (
            <form onSubmit={handleCreateCategory} className="admin-form">
              <input
                type="text"
                placeholder="Nome da categoria"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Descrição"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
              <button type="submit" className="btn btn-success">Criar Categoria</button>
            </form>
          )}

          <div className="category-list">
            {categories.map((cat) => (
              <div key={cat.id} className="category-item">
                <strong>{cat.name}</strong>
                <p>{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minhas Lojas */}
      {userStores.length > 0 && (
        <div className="admin-section">
          <h2>Minhas Lojas</h2>
          <div className="my-stores">
            {userStores.map(store => (
              <div key={store.id} className="store-card">
                <h3>{store.name}</h3>
                <p>{store.description}</p>
                <p><strong>Endereço:</strong> {store.address}</p>
                <p><strong>Telefone:</strong> {store.phone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos - Todos veem, mas com filtros diferentes */}
      <div className="admin-section">
        <div className="admin-header">
          <h2>{userStores.length > 0 ? 'Produtos da Minha Loja' : 'Produtos'}</h2>
          <div className="admin-actions-row">
            {userStores.length > 0 && (
              <>
                <button
                  onClick={() => setShowFeaturedModal(true)}
                  className="btn btn-info"
                >
                  ⭐ Ver Produtos em Destaque
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setNewProduct({ name: '', description: '', price: '', category: '', stock: '', featured: false });
                    setProductImage(null);
                    setProductImages([]);
                    setImagePreviews([]);
                    setShowProductForm(!showProductForm);
                  }}
                  className="btn btn-primary"
                >
                  {showProductForm ? 'Cancelar' : 'Novo Produto'}
                </button>
              </>
            )}
          </div>
        </div>

        {showProductForm && userStores.length > 0 && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                <button className="modal-close" onClick={handleCancelEdit}>×</button>
              </div>
              
              {successMessage && (
                <div className="success-banner">
                  {successMessage}
                </div>
              )}
              
              <form onSubmit={handleCreateProduct} className="modal-form">
                <div className={`form-field ${formErrors.name ? 'has-error' : ''}`}>
                  <input
                    type="text"
                    placeholder="Nome do produto"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                  />
                  {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                </div>
                
                <div className="form-field">
                  <textarea
                    placeholder="Descrição"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    required
                  />
                </div>
                
                <div className={`form-field ${formErrors.price ? 'has-error' : ''}`}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Preço"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    required
                  />
                  {formErrors.price && <span className="error-message">{formErrors.price}</span>}
                </div>
                
                <div className={`form-field ${formErrors.category ? 'has-error' : ''}`}>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    required
                  >
                    <option value="">Selecione a categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && <span className="error-message">{formErrors.category}</span>}
                </div>
                
                <div className="store-info">
                  <strong>Loja:</strong> {userStores[0]?.name}
                </div>
                
                <div className={`form-field ${formErrors.stock ? 'has-error' : ''}`}>
                  <input
                    type="number"
                    placeholder="Estoque"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    required
                  />
                  {formErrors.stock && <span className="error-message">{formErrors.stock}</span>}
                </div>
                
                <div className="form-field checkbox-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newProduct.featured}
                      onChange={(e) => setNewProduct({ ...newProduct, featured: e.target.checked })}
                    />
                    <span>⭐ Exibir no Slider (Destaque)</span>
                  </label>
                  <p className="help-text">Produtos marcados aparecem no slider da página inicial</p>
                </div>
                
                <div className="form-field checkbox-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newProduct.visible !== undefined ? newProduct.visible : true}
                      onChange={(e) => setNewProduct({ ...newProduct, visible: e.target.checked })}
                    />
                    <span>👁️ Produto Visível</span>
                  </label>
                  <p className="help-text">Controla se o produto aparece no slider (quando em destaque)</p>
                </div>
                
                <div className="file-input-wrapper">
                  <label>Imagem de Capa:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingProduct}
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '120px', marginTop: '8px', borderRadius: '8px' }} />
                  )}
                </div>

                <div className="file-input-wrapper">
                  <label>
                    📷 Imagens do Catálogo (Galeria) - Máximo 5 imagens
                    {productImages.length > 0 && (
                      <span className={`image-count ${productImages.length >= 5 ? 'limit-reached' : ''}`}>
                        {' '}- {productImages.length}/5 {productImages.length === 1 ? 'imagem' : 'imagens'}
                        {productImages.length >= 5 ? ' (limite atingido)' : ''}
                      </span>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAdditionalImagesChange}
                    disabled={productImages.length >= 5}
                  />
                  <p className="help-text">
                    {productImages.length >= 5 
                      ? '✓ Limite de 5 imagens atingido. Remova alguma para adicionar outra.' 
                      : 'Adicione imagens uma por uma ou múltiplas de vez (Ctrl/Cmd + clique)'
                    }
                  </p>
                  {imagePreviews.length > 0 && (
                    <div className="gallery-previews">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="gallery-preview-item">
                          <img src={preview} alt={`Imagem ${index + 1}`} />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => removeAdditionalImage(index)}
                            title="Remover imagem"
                          >
                            ✕
                          </button>
                          <div className="image-number">{index + 1}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {formErrors.submit && (
                  <div className="error-banner">
                    {formErrors.submit}
                  </div>
                )}
                
                <div className="modal-actions">
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner"></span>
                        {editingProduct ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      editingProduct ? 'Atualizar' : 'Criar Produto'
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelEdit} 
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {userStores.length > 0 && (
          <div className="inventory-tools">
            <label className="inventory-search">
              <span>Buscar produto</span>
              <input
                type="search"
                placeholder="Nome ou categoria..."
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </label>
            <label className="inventory-filter">
              <span>Filtrar estoque</span>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                <option value="all">Todos os produtos</option>
                <option value="out">Sem estoque</option>
                <option value="low">Estoque baixo (1–5)</option>
                <option value="ok">Estoque saudável (6+)</option>
              </select>
            </label>
            <p className="inventory-result-count">{filteredStoreProducts.length} de {productsForView.length} produtos</p>
          </div>
        )}

        {userStores.length > 0 ? (
          <div className="inventory-grid">
            {filteredStoreProducts.map((product) => {
              const stock = Number(product.stock) || 0;
              const stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';
              const isVisible = product.visible !== false;
              return (
                <article
                  className="inventory-card"
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver detalhes de ${product.name}`}
                  onClick={() => setSelectedProduct(product)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setSelectedProduct(product);
                    }
                  }}
                >
                  <div className="inventory-card-image">
                    {product.image ? <img src={product.image} alt={`Capa de ${product.name}`} /> : <span>Sem imagem</span>}
                    <span className={`inventory-stock-status ${stockClass}`}>
                      {stock === 0 ? 'Sem estoque' : stock <= 5 ? 'Estoque baixo' : 'Em estoque'}
                    </span>
                  </div>
                  <div className="inventory-card-content">
                    <div className="inventory-product-heading">
                      <div>
                        <h3>{product.name}</h3>
                        <p>{product.category_name || 'Sem categoria'}</p>
                      </div>
                      <strong>R$ {parseFloat(product.price).toFixed(2)}</strong>
                    </div>
                    <div className={`inventory-stock-quantity ${stockClass}`}>
                      <span>Quantidade disponível</span>
                      <strong>{stock} <small>{stock === 1 ? 'unidade' : 'unidades'}</small></strong>
                    </div>
                    <div className="inventory-card-footer">
                      <span className={`status-badge ${product.available ? 'available' : 'unavailable'}`}>
                        {product.available ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                    <div className="inventory-card-actions" aria-label={`Ações para ${product.name}`}>
                      <button onClick={(event) => { event.stopPropagation(); handleEditProduct(product); }} className="btn btn-sm btn-warning product-action-btn">✏️ Editar</button>
                      <button
                        onClick={(event) => { event.stopPropagation(); handleToggleFeatured(product); }}
                        className={`btn btn-sm inventory-toggle ${product.featured ? 'active' : ''}`}
                        disabled={togglingProductId === product.id}
                        title={product.featured ? 'Remover dos destaques' : 'Adicionar aos destaques'}
                      >
                        {product.featured ? '⭐ Em destaque' : '☆ Destacar'}
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); handleToggleVisible(product); }}
                        className="btn btn-sm inventory-toggle"
                        disabled={togglingProductId === product.id}
                        title={isVisible ? 'Ocultar produto' : 'Tornar produto visível'}
                      >
                        {isVisible ? '👁️ Visível' : '🙈 Oculto'}
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); handleDeleteProduct(product.id); }} className="btn btn-sm btn-danger">🗑️ Remover</button>
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredStoreProducts.length === 0 && (
              <p className="inventory-empty">Nenhum produto corresponde à busca ou ao filtro selecionado.</p>
            )}
          </div>
        ) : (
        <div className="product-list-admin">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Loja</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                {userStores.length > 0 && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {productsForView.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.store_name || 'N/A'}</td>
                  <td>{product.category_name}</td>
                  <td>R$ {parseFloat(product.price).toFixed(2)}</td>
                  <td>
                    <span className={`stock-badge ${product.stock === 0 ? 'zero' : product.stock <= 5 ? 'low' : 'ok'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${product.available ? 'available' : 'unavailable'}`}>
                      {product.available ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>
                  {userStores.length > 0 && (
                    <td>
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="btn btn-sm btn-warning product-action-btn"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Deletar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {productsForView.length === 0 && (
                <tr>
                  <td colSpan={userStores.length > 0 ? 7 : 6} className="empty-table-message">
                    Nenhum produto encontrado para exibicao.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {selectedProduct && (
        <div className="modal-overlay inventory-detail-overlay" onClick={() => setSelectedProduct(null)}>
          <section
            className="inventory-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="inventory-detail-title">Detalhes do produto</h3>
              <button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label="Fechar detalhes">×</button>
            </div>
            <div className="inventory-detail-body">
              <div className="inventory-detail-image">
                {selectedProduct.image
                  ? <img src={selectedProduct.image} alt={`Capa de ${selectedProduct.name}`} />
                  : <span>Sem imagem</span>}
              </div>
              <div className="inventory-detail-info">
                <p className="inventory-detail-category">{selectedProduct.category_name || 'Sem categoria'}</p>
                <h2>{selectedProduct.name}</h2>
                <p className="inventory-detail-price">R$ {parseFloat(selectedProduct.price).toFixed(2)}</p>
                <div className="inventory-detail-stock">
                  <span>Estoque disponível</span>
                  <strong>{selectedProduct.stock} {Number(selectedProduct.stock) === 1 ? 'unidade' : 'unidades'}</strong>
                </div>
                <p className="inventory-detail-description">
                  {selectedProduct.description || 'Este produto não possui descrição.'}
                </p>
                <div className="inventory-detail-badges">
                  <span className={`status-badge ${selectedProduct.available ? 'available' : 'unavailable'}`}>
                    {selectedProduct.available ? 'Disponível' : 'Indisponível'}
                  </span>
                  <span className="inventory-detail-tag">{selectedProduct.featured ? '⭐ Em destaque' : 'Sem destaque'}</span>
                  <span className="inventory-detail-tag">{selectedProduct.visible === false ? '🙈 Oculto' : '👁️ Visível'}</span>
                </div>
                <div className="inventory-detail-actions">
                  <button
                    className="btn btn-warning"
                    onClick={() => {
                      const product = selectedProduct;
                      setSelectedProduct(null);
                      handleEditProduct(product);
                    }}
                  >
                    ✏️ Editar produto
                  </button>
                  <button className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>Fechar</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {userStores.length === 0 && !isAdmin && (
        <div className="no-store-message">
          <p>Você ainda não possui uma loja. Entre em contato com o administrador para criar uma loja para você.</p>
        </div>
      )}

      {/* Modal de Produtos em Destaque */}
      {showFeaturedModal && (
        <div className="modal-overlay" onClick={() => setShowFeaturedModal(false)}>
          <div className="modal-content featured-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⭐ Produtos em Destaque no Slider</h3>
              <button className="modal-close" onClick={() => setShowFeaturedModal(false)}>×</button>
            </div>
            
            <div className="featured-products-container">
              <div className="featured-section">
                <h4 style={{color: '#28a745', marginBottom: '1rem'}}>✅ Produtos Marcados (Aparecem no Slider)</h4>
                <div className="featured-grid">
                  {products.filter(p => p.featured).length > 0 ? (
                    products.filter(p => p.featured).map(product => (
                      <div key={product.id} className="featured-card">
                        <div className="featured-image">
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <div className="no-image">Sem imagem</div>
                          )}
                        </div>
                        <div className="featured-info">
                          <h5>{product.name}</h5>
                          <p className="featured-price">R$ {parseFloat(product.price).toFixed(2)}</p>
                          <div className="featured-actions">
                            <div className="badge-group">
                              <span className="badge badge-success">No Slider</span>
                              {product.visible ? (
                                <span className="badge badge-info">👁️ Visível</span>
                              ) : (
                                <span className="badge badge-warning">🚫 Oculto</span>
                              )}
                            </div>
                            <div className="button-group">
                              <button
                                className="btn-toggle-featured btn-remove"
                                onClick={() => handleToggleFeatured(product)}
                                disabled={togglingProductId === product.id}
                                title="Remover do slider"
                              >
                                {togglingProductId === product.id ? '⏳' : '❌ Remover'}
                              </button>
                              <button
                                className={`btn-toggle-visible ${product.visible ? 'btn-hide' : 'btn-show'}`}
                                onClick={() => handleToggleVisible(product)}
                                disabled={togglingProductId === product.id}
                                title={product.visible ? 'Ocultar produto' : 'Mostrar produto'}
                              >
                                {togglingProductId === product.id ? '⏳' : (product.visible ? '🚫 Ocultar' : '👁️ Mostrar')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-message">Nenhum produto marcado como destaque</p>
                  )}
                </div>
              </div>

              <div className="featured-section">
                <h4 style={{color: '#6c757d', marginBottom: '1rem'}}>⚪ Produtos Não Marcados</h4>
                <div className="featured-grid">
                  {products.filter(p => !p.featured).length > 0 ? (
                    products.filter(p => !p.featured).map(product => (
                      <div key={product.id} className="featured-card">
                        <div className="featured-image">
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <div className="no-image">Sem imagem</div>
                          )}
                        </div>
                        <div className="featured-info">
                          <h5>{product.name}</h5>
                          <p className="featured-price">R$ {parseFloat(product.price).toFixed(2)}</p>
                          <div className="featured-actions">
                            <span className="badge badge-secondary">Não no Slider</span>
                            <button
                              className="btn-toggle-featured btn-add"
                              onClick={() => handleToggleFeatured(product)}
                              disabled={togglingProductId === product.id}
                              title="Adicionar ao slider"
                            >
                              {togglingProductId === product.id ? '⏳ Processando...' : '✅ Adicionar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-message">Todos os produtos estão marcados</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
