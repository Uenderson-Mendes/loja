# Sistema de E-commerce Full-Stack
## React + Django REST Framework + SQLite3

Sistema completo de e-commerce com frontend React e backend Django REST Framework usando SQLite3.

## 📋 Funcionalidades

### Backend (Django REST Framework)
- ✅ Autenticação JWT (login/registro/refresh token)
- ✅ CRUD completo de Produtos
- ✅ CRUD de Categorias
- ✅ Sistema de Lojas (multi-vendor)
- ✅ Upload de imagens (produto principal + galeria)
- ✅ Gerenciamento de Carrinho
- ✅ Sistema de Pedidos
- ✅ Perfil de Usuário
- ✅ Painel Administrativo
- ✅ Controle de visibilidade de produtos
- ✅ Sistema de produtos em destaque (slider)
- ✅ Cache de produtos para performance
- ✅ Filtros por categoria

### Frontend (React)
- ✅ **Home com Slider** - Produtos em destaque em carrossel animado
- ✅ **Listagem de produtos** - Grid responsivo com filtros por categoria
- ✅ **Detalhes do produto** - Galeria de imagens, informações completas
- ✅ **Carrinho de compras** - Adicionar, remover, atualizar quantidades
- ✅ **Sistema de autenticação** - Login, registro, perfil
- ✅ **Histórico de pedidos** - Visualizar pedidos realizados
- ✅ **Painel administrativo completo**:
  - Gerenciar produtos (criar, editar, deletar)
  - Upload de múltiplas imagens
  - Controle de visibilidade (visível/oculto)
  - Marcar produtos em destaque para o slider
  - Gerenciar categorias e lojas
  - Tabela responsiva com scroll horizontal
- ✅ **Design 100% responsivo** - Mobile, tablet e desktop
- ✅ **Filtros independentes** - Slider não afetado por filtros de categoria

## 🚀 Como Executar

### Backend

1. Navegue até a pasta do backend:
```bash
cd backend
```

2. Crie e ative um ambiente virtual:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Execute as migrações:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Crie um superusuário:
```bash
python manage.py createsuperuser
```

6. Inicie o servidor:
```bash
python manage.py runserver
```

O backend estará rodando em `http://localhost:8000`

### Frontend

1. Em outro terminal, navegue até a pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm start
```

O frontend estará rodando em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
ecommerc/
├── backend/                # Django REST Framework
│   ├── config/            # Configurações do Django
│   ├── store/             # App principal da loja
│   ├── users/             # App de usuários
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/              # React
    ├── public/
    ├── src/
    │   ├── components/   # Componentes React
    │   ├── pages/        # Páginas
    │   ├── services/     # Serviços API
    │   └── styles/       # Estilos CSS
    └── package.json
```

## 🔑 Endpoints da API

### Autenticação
- `POST /api/token/` - Login (obter tokens)
- `POST /api/token/refresh/` - Refresh token
- `POST /api/users/register/` - Registro de usuário
- `GET /api/users/me/` - Dados do usuário atual

### Produtos
- `GET /api/store/products/` - Listar produtos (com filtros e cache)
- `GET /api/store/products/{id}/` - Detalhes do produto
- `POST /api/store/products/` - Criar produto (autenticado)
- `PUT /api/store/products/{id}/` - Atualizar produto completo (autenticado)
- `PATCH /api/store/products/{id}/` - Atualizar campos específicos (autenticado)
- `DELETE /api/store/products/{id}/` - Deletar produto (autenticado)

### Imagens de Produtos
- `GET /api/store/product-images/` - Listar imagens
- `POST /api/store/product-images/` - Adicionar imagem à galeria (autenticado)
- `DELETE /api/store/product-images/{id}/` - Deletar imagem (autenticado)

### Lojas
- `GET /api/store/stores/` - Listar lojas
- `POST /api/store/stores/` - Criar loja (autenticado)
- `GET /api/store/stores/{id}/` - Detalhes da loja

### Categorias
- `GET /api/store/categories/` - Listar categorias
- `POST /api/store/categories/` - Criar categoria (admin)

### Carrinho
- `GET /api/store/cart/` - Ver carrinho
- `POST /api/store/cart/add_item/` - Adicionar item
- `POST /api/store/cart/update_item/` - Atualizar quantidade
- `POST /api/store/cart/remove_item/` - Remover item
- `POST /api/store/cart/clear/` - Limpar carrinho

### Pedidos
- `GET /api/store/orders/` - Listar pedidos do usuário
- `POST /api/store/orders/` - Criar pedido
- `GET /api/store/orders/{id}/` - Detalhes do pedido

## 🎨 Telas do Sistema

1. **Home** (`/`) 
   - Slider automático com produtos em destaque
   - Pills de categorias com scroll horizontal
   - Grid de produtos responsivo
   - Filtro por categoria (não afeta o slider)
   - Botão de refresh para atualizar produtos

2. **Login/Registro** (`/login`, `/register`)
   - Formulários de autenticação
   - Validação de campos
   - Redirecionamento automático

3. **Detalhes do Produto** (`/product/:id`)
   - Galeria de imagens com navegação
   - Informações completas (nome, preço, descrição, estoque)
   - Botão para adicionar ao carrinho
   - Design responsivo com breakpoints múltiplos

4. **Carrinho** (`/cart`)
   - Lista de itens com imagens
   - Controle de quantidade (+/-)
   - Remover itens
   - Total calculado automaticamente
   - Finalizar compra

5. **Meus Pedidos** (`/orders`)
   - Histórico completo de pedidos
   - Status de cada pedido
   - Detalhes dos itens

6. **Perfil** (`/profile`)
   - Dados do usuário
   - Editar informações

7. **Painel Admin** (`/admin`)
   - **Gerenciar Produtos**:
     - Tabela com todos os produtos
     - Badges de status (Destaque, Visível)
     - Botões de ação (Editar, Deletar)
     - Toggle rápido de visibilidade
     - Toggle para adicionar/remover do slider
     - Scroll horizontal em mobile
     - Botões de ação fixos (sticky)
   - **Criar/Editar Produto**:
     - Formulário completo
     - Upload de imagem principal
     - Upload de múltiplas imagens para galeria
     - Checkbox para marcar como destaque
     - Validação de campos
   - **Gerenciar Categorias**:
     - Criar novas categorias
     - Lista de categorias existentes
   - **Gerenciar Lojas**:
     - Criar loja
     - Associar produtos à loja

## 🛠️ Tecnologias Utilizadas

### Backend
- **Django 5.0** - Framework web
- **Django REST Framework 3.14** - API REST
- **Simple JWT** - Autenticação com tokens
- **CORS Headers** - Cross-Origin Resource Sharing
- **SQLite3** - Banco de dados
- **Pillow** - Processamento de imagens
- **Django Cache Framework** - Cache de produtos

### Frontend
- **React 18.2** - Biblioteca UI
- **React Router DOM 6.20** - Roteamento
- **Axios** - Cliente HTTP com interceptors
- **CSS3 Moderno**:
  - CSS Variables
  - Flexbox e Grid
  - Media queries (responsivo)
  - Animations e transitions
  - Custom scrollbars

## 🎯 Destaques Técnicos

### Performance
- Cache de produtos no backend (invalidação automática)
- Timestamp no frontend para bypass de cache quando necessário
- Lazy loading de imagens
- Otimização de re-renders no React

### Responsividade
- **4 breakpoints principais**:
  - Desktop: > 968px
  - Tablet: 768px - 968px
  - Mobile: 480px - 768px
  - Small mobile: < 480px
- Slider adaptativo com tamanhos dinâmicos
- Tabelas com scroll horizontal em mobile
- Grids flexíveis (auto-fill, minmax)

### UX/UI
- Slider com auto-play (5 segundos)
- Navegação por botões ou dots
- Scroll suave (smooth)
- Feedback visual em todas as ações
- Loading states
- Error handling com mensagens claras
- Animações suaves (transitions)

### Arquitetura
- **Backend**: Arquitetura RESTful
- **Frontend**: Component-based architecture
- **Autenticação**: JWT com refresh token automático
- **Uploads**: FormData com multipart/form-data
- **Validação**: Client-side e server-side

## 📝 Funcionalidades Implementadas Recentemente

- ✅ Sistema de produtos em destaque com slider automático
- ✅ Controle de visibilidade de produtos (visible/hidden)
- ✅ Upload de múltiplas imagens para galeria de produtos
- ✅ Filtro independente (slider não afetado por filtros)
- ✅ Design responsivo completo (4 breakpoints)
- ✅ Tabela admin com scroll horizontal e ações fixas
- ✅ Cache inteligente com invalidação automática
- ✅ Partial updates com PATCH (campos opcionais)
- ✅ Correção de headers em requisições FormData
- ✅ Z-index management para evitar sobreposição de elementos
- ✅ Axios interceptors para autenticação e refresh token

## 🐛 Correções de Bugs Recentes

- ✅ Erro 400/401 em PATCH requests (headers conflitantes)
- ✅ Overflow de imagens no ProductDetail
- ✅ Botões de ação sumindo em tabelas mobile
- ✅ Categorias interferindo com z-index do slider
- ✅ Serializer exigindo campos em updates parciais
- ✅ Hot reload do React com cache desatualizado

## 📚 Próximos Passos Sugeridos

- [ ] Sistema de avaliações e comentários
- [ ] Busca de produtos (full-text search)
- [ ] Integração com gateway de pagamento (Stripe/PagSeguro)
- [ ] Sistema de cupons de desconto
- [ ] Notificações por email (confirmação de pedido)
- [ ] Dashboard de vendas para vendedores
- [ ] Sistema de favoritos/wishlist
- [ ] Comparação de produtos
- [ ] Histórico de visualizações
- [ ] Recomendações baseadas em IA
- [ ] Exportação de pedidos (PDF/Excel)
- [ ] Multi-idioma (i18n)

## 👨‍💻 Admin

Acesse o painel administrativo do Django em `http://localhost:8000/admin` com as credenciais do superusuário criado.

## 📄 Licença

Este projeto é livre para uso educacional e comercial.
