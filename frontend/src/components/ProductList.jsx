import React, { useState, useEffect, useRef } from 'react';
import { getProducts, getCategories } from '../services/api.jsx';
import ProductCard from './ProductCard.jsx';
import './ProductList.css';

const ProductList = () => {
  const [allProducts, setAllProducts] = useState([]); // Todos os produtos sem filtro
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  
  // Slider sempre mostra TODOS os produtos em destaque (sem filtro de categoria)
  const featuredProducts = allProducts.filter(p => p.featured && p.visible);
  
  // Produtos filtrados para a grade (aplicam filtro de categoria)
  const filteredProducts = selectedCategory 
    ? allProducts.filter(p => p.category === selectedCategory)
    : allProducts;
  
  // Debug: Log dos produtos em destaque
  useEffect(() => {
    console.log('=== SLIDER DEBUG ===');
    console.log('Total de produtos:', allProducts.length);
    console.log('Produtos em destaque:', allProducts.filter(p => p.featured).length);
    console.log('Produtos em destaque E visíveis:', featuredProducts.length);
    console.log('Lista de produtos no slider:', featuredProducts.map(p => ({id: p.id, name: p.name, featured: p.featured, visible: p.visible})));
    console.log('Produtos filtrados para grade:', filteredProducts.length);
  }, [allProducts, featuredProducts, filteredProducts]);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []); // Removido selectedCategory - agora filtramos localmente

  const loadCategories = async () => {
    try {
      // Buscar todas as categorias sem paginação
      const response = await getCategories({ page_size: 1000 });
      console.log('Resposta de categorias:', response.data);
      
      // Verificar se vem com paginação (results) ou direto
      const categoriesData = response.data.results || response.data;
      const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
      
      console.log('Categorias carregadas:', categoriesArray);
      console.log('Total de categorias:', categoriesArray.length);
      setCategories(categoriesArray);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Sempre busca TODOS os produtos (sem filtro de categoria)
      const params = { _t: Date.now() }; // Timestamp para bypass do cache
      const response = await getProducts(params);
      console.log('Resposta de produtos:', response.data);
      
      const productsData = response.data.results || response.data;
      const productsArray = Array.isArray(productsData) ? productsData : [];
      
      console.log('Produtos carregados:', productsArray);
      setAllProducts(productsArray); // Armazena todos os produtos
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadProducts();
    loadCategories();
  };

  // Auto-slide do carrossel
  useEffect(() => {
    if (featuredProducts.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % featuredProducts.length;
        
        // Scroll suave para o próximo item
        if (sliderRef.current) {
          const sliderWidth = sliderRef.current.offsetWidth;
          const itemWidth = 500; // max-width do slider-item
          const gap = 24; // var(--spacing-lg)
          const scrollPosition = nextSlide * (itemWidth + gap);
          
          sliderRef.current.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        }
        
        return nextSlide;
      });
    }, 5000); // 5 segundos entre cada slide
    
    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => {
      const next = (prev + 1) % featuredProducts.length;
      
      if (sliderRef.current) {
        const itemWidth = 500;
        const gap = 24;
        const scrollPosition = next * (itemWidth + gap);
        sliderRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
      
      return next;
    });
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => {
      const previous = (prev - 1 + featuredProducts.length) % featuredProducts.length;
      
      if (sliderRef.current) {
        const itemWidth = 500;
        const gap = 24;
        const scrollPosition = previous * (itemWidth + gap);
        sliderRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
      
      return previous;
    });
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
  };

  return (
    <div className="product-list-container">
      {/* Slider de Produtos em Destaque */}
      {featuredProducts.length > 0 && (
        <div className="products-slider">
          <button className="slider-btn prev" onClick={prevSlide}>‹</button>
          <div className="slider-content" ref={sliderRef}>
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className={`slider-item ${index === currentSlide ? 'active' : ''}`}
              >
                <div className="slider-image">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <div className="no-image">Sem imagem</div>
                  )}
                </div>
                <div className="slider-info">
                  <h3>{product.name}</h3>
                  <p className="slider-description">{product.description}</p>
                  <p className="slider-price">R$ {parseFloat(product.price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="slider-btn next" onClick={nextSlide}>›</button>
          <div className="slider-dots">
            {featuredProducts.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Seção de Categorias */}
      <div className="categories-section">
        <div className="categories-scroll">
          <button 
            className={`category-pill ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="product-list-wrapper">
        <div className="products-main">
          <div className="products-header">
            <h2>Produtos</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className="products-count">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
              </span>
              <button onClick={handleRefresh} className="btn-refresh" title="Atualizar produtos">
                🔄
              </button>
            </div>
          </div>
          <div className="products-grid">
            {loading ? (
              <div className="loading-state">Carregando produtos...</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="empty-state">
                <p>Nenhum produto encontrado.</p>
                {selectedCategory && (
                  <button onClick={() => setSelectedCategory('')} className="btn-primary">
                    Ver todos os produtos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="filters-sidebar">
          <div className="filters-content">
            <h3>Filtrar</h3>
            <div className="filter-item">
              <label>Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory('')}
                className="btn-clear-filter"
              >
                Limpar
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductList;
