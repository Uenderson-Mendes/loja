import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, addToCart } from '../services/api.jsx';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await getProduct(id);
      const productData = response.data;
      setProduct(productData);
      
      // Define selectedImage imediatamente
      if (productData.image) {
        setSelectedImage(productData.image);
      } else if (productData.images && productData.images.length > 0) {
        setSelectedImage(productData.images[0].image);
      }
      
      console.log('Product loaded:', productData);
      console.log('Images:', productData.images);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      setMessage('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await addToCart(product.id, quantity);
      setMessage('Produto adicionado ao carrinho!');
      setTimeout(() => {
        navigate('/cart');
      }, 1500);
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      setMessage('Erro ao adicionar ao carrinho');
    }
  };

  if (loading) return <p>Carregando...</p>;
  if (!product) return <p>Produto não encontrado</p>;

  // Todas as imagens do produto (capa + galeria)
  const allImages = [
    product.image,
    ...(product.images || []).map(img => img.image)
  ].filter(Boolean);

  console.log('Selected Image:', selectedImage);
  console.log('All Images:', allImages);
  console.log('Product:', product);

  return (
    <div className="product-detail">
      <div className="product-detail-content">
        <div className="product-detail-image-container">
          {allImages.length > 0 && (
            <div className="image-gallery">
              {allImages.map((image, index) => (
                <div
                  key={index}
                  className={`gallery-thumb ${selectedImage === image ? 'active' : ''}`}
                  onClick={() => setSelectedImage(image)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </div>
              ))}
            </div>
          )}

          <div className="product-detail-image">
            <div className="main-image">
              {selectedImage ? (
                <img src={selectedImage} alt={product.name} />
              ) : (
                <div className="image-placeholder">Sem imagem</div>
              )}
            </div>
          </div>
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="category">Categoria: {product.category_name}</p>
          <p className="price">R$ {parseFloat(product.price).toFixed(2)}</p>
          <p className="description">{product.description}</p>
          <p className="stock">
            {product.stock > 0
              ? `${product.stock} unidades em estoque`
              : 'Produto indisponível'}
          </p>

          {product.stock > 0 && (
            <div className="product-actions">
              <div className="quantity-selector">
                <label>Quantidade:</label>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                />
              </div>
              <button onClick={handleAddToCart} className="btn btn-buy-now">
                Comprar agora
              </button>
              <button onClick={handleAddToCart} className="btn btn-add-cart">
                Adicionar ao carrinho
              </button>
              <button className="btn btn-back" onClick={() => navigate(-1)}>
                ← Voltar
              </button>
            </div>
          )}
        </div>
      </div>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default ProductDetail;
