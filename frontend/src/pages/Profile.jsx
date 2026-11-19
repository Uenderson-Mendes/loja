import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/api.jsx';
import api from '../services/api.jsx';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const [userStores, setUserStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Carregar dados do usuário
      const userResponse = await getCurrentUser();
      setUser(userResponse.data);

      // Carregar perfil do usuário
      try {
        const profileResponse = await api.get('/users/profile/');
        if (profileResponse.data) {
          setProfile({
            phone: profileResponse.data.phone || '',
            address: profileResponse.data.address || '',
            city: profileResponse.data.city || '',
            state: profileResponse.data.state || '',
            zipcode: profileResponse.data.zipcode || '',
          });
        }
      } catch (error) {
        console.log('Perfil não encontrado, será criado ao salvar');
      }

      // Carregar lojas do usuário
      const storesResponse = await api.get('/store/stores/');
      const allStores = storesResponse.data.results || storesResponse.data || [];
      const myStores = allStores.filter(store => store.owner === userResponse.data.id);
      setUserStores(myStores);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      navigate('/login');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/profile/', profile);
      setMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage('Erro ao atualizar perfil: ' + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
    }
  };

  if (loading) {
    return <div className="container">Carregando...</div>;
  }

  return (
    <div className="container">
      <div className="profile-page">
        <h1>Meu Perfil</h1>

        {message && (
          <div className={`message ${message.includes('sucesso') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Informações do Usuário */}
        <div className="profile-section">
          <h2>Informações da Conta</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Usuário:</strong> {user?.username}
            </div>
            <div className="info-item">
              <strong>Email:</strong> {user?.email}
            </div>
            <div className="info-item">
              <strong>Nome:</strong> {user?.first_name} {user?.last_name}
            </div>
            <div className="info-item">
              <strong>Tipo:</strong> {user?.is_staff ? 'Administrador' : userStores.length > 0 ? 'Proprietário de Loja' : 'Cliente'}
            </div>
          </div>
        </div>

        {/* Lojas do Usuário */}
        {userStores.length > 0 && (
          <div className="profile-section">
            <h2>Minhas Lojas</h2>
            {userStores.map(store => (
              <div key={store.id} className="store-info-card">
                <h3>{store.name}</h3>
                <p><strong>Descrição:</strong> {store.description}</p>
                <p><strong>Endereço:</strong> {store.address}</p>
                <p><strong>Telefone:</strong> {store.phone}</p>
                <p><strong>Email:</strong> {store.email}</p>
                <p><strong>Status:</strong> <span className={store.active ? 'status-active' : 'status-inactive'}>
                  {store.active ? 'Ativa' : 'Inativa'}
                </span></p>
              </div>
            ))}
          </div>
        )}

        {/* Formulário de Edição de Perfil */}
        <div className="profile-section">
          <h2>Dados Pessoais</h2>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Telefone:</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="form-group">
              <label>Endereço:</label>
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Rua, número, complemento"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cidade:</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="Cidade"
                />
              </div>

              <div className="form-group">
                <label>Estado:</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="Estado"
                  maxLength="2"
                />
              </div>

              <div className="form-group">
                <label>CEP:</label>
                <input
                  type="text"
                  value={profile.zipcode}
                  onChange={(e) => setProfile({ ...profile, zipcode: e.target.value })}
                  placeholder="00000-000"
                  maxLength="9"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Salvar Alterações
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
