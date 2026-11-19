from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.db.models import Count, Sum, Avg, F, Q, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce, TruncDate, ExtractWeekDay
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from .models import Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Store
from .serializers import (
    CategorySerializer, ProductSerializer, ProductImageSerializer, CartSerializer, 
    CartItemSerializer, OrderSerializer, OrderCreateSerializer, StoreSerializer
)


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]

    # Cache de lojas por 15 minutos
    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        cache.delete('store_list')
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        cache.delete('store_list')
        cache.delete(f'store_{serializer.instance.id}')
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        cache.delete('store_list')
        cache.delete(f'store_{instance.id}')
        super().perform_destroy(instance)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    # Cache de categorias por 30 minutos (mudam raramente)
    @method_decorator(cache_page(60 * 30))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        cache.delete('category_list')
        super().perform_create(serializer)

    def perform_update(self, serializer):
        cache.delete('category_list')
        super().perform_update(serializer)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(available=True)
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ['category']
    search_fields = ['name', 'description']

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category__id=category)
        return queryset

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        cache.delete('product_list')
        super().perform_create(serializer)

    def perform_update(self, serializer):
        cache.delete('product_list')
        cache.delete(f'product_{serializer.instance.id}')
        super().perform_update(serializer)
    
    def update(self, request, *args, **kwargs):
        # Limpar cache antes de atualizar
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        cache.delete('product_list')
        cache.delete(f'product_{instance.id}')
        return super().update(request, *args, partial=partial, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        cache.delete('product_list')
        cache.delete(f'product_{instance.id}')
        super().perform_destroy(instance)


class ProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
           cache.delete('product_list')
           product_id = serializer.validated_data['product'].id
           cache.delete(f'product_{product_id}')
           # Log para debug do upload de imagens
           from django.conf import settings
           import logging
           logger = logging.getLogger('django')
           logger.info(f"request.FILES: {self.request.FILES}")
           logger.info(f"request.POST: {self.request.POST}")
           super().perform_create(serializer)

    def perform_destroy(self, instance):
        cache.delete('product_list')
        cache.delete(f'product_{instance.product.id}')
        super().perform_destroy(instance)


class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Tentar buscar do cache
        cache_key = f'cart_{request.user.id}'
        cart_data = cache.get(cache_key)
        
        if cart_data is None:
            # Se não está no cache, busca do banco
            cart, created = Cart.objects.get_or_create(user=request.user)
            serializer = CartSerializer(cart)
            cart_data = serializer.data
            
            # Salva no cache por 2 minutos
            cache.set(cache_key, cart_data, 60 * 2)
        
        return Response(cart_data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        product = get_object_or_404(Product, id=product_id)

        if product.stock < quantity:
            return Response(
                {'error': 'Estoque insuficiente'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            new_quantity = cart_item.quantity + quantity
            if product.stock < new_quantity:
                return Response(
                    {'error': 'Estoque insuficiente'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = new_quantity
            cart_item.save()

        # Limpar cache do carrinho
        cache.delete(f'cart_{request.user.id}')

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        cart = Cart.objects.get(user=request.user)
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))

        cart_item = get_object_or_404(CartItem, id=item_id, cart=cart)

        if quantity <= 0:
            cart_item.delete()
        else:
            if cart_item.product.stock < quantity:
                return Response(
                    {'error': 'Estoque insuficiente'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = quantity
            cart_item.save()

        # Limpar cache do carrinho
        cache.delete(f'cart_{request.user.id}')

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart = Cart.objects.get(user=request.user)
        item_id = request.data.get('item_id')
        cart_item = get_object_or_404(CartItem, id=item_id, cart=cart)
        cart_item.delete()

        # Limpar cache do carrinho
        cache.delete(f'cart_{request.user.id}')

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        cart = Cart.objects.get(user=request.user)
        CartItem.objects.filter(cart=cart).delete()
        
        # Limpar cache do carrinho
        cache.delete(f'cart_{request.user.id}')
        
        serializer = CartSerializer(cart)
        return Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def create(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            
            # Limpar cache do carrinho após criar pedido
            cache.delete(f'cart_{request.user.id}')
            
            order_serializer = OrderSerializer(order)
            return Response(order_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='store-orders')
    def store_orders(self, request):
        user = request.user
        is_admin = user.is_staff or user.is_superuser

        if is_admin:
            scoped_items = OrderItem.objects.select_related('order', 'product', 'order__user')
        else:
            user_store_ids = list(
                Store.objects.filter(owner=user).values_list('id', flat=True)
            )
            if not user_store_ids:
                return Response(
                    {'detail': 'Acesso permitido apenas para perfil de loja.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            scoped_items = OrderItem.objects.filter(
                product__store_id__in=user_store_ids
            ).select_related('order', 'product', 'order__user')

        scoped_items = scoped_items.order_by('-order__created_at', 'id')

        orders_map = {}
        for item in scoped_items:
            order = item.order
            order_data = orders_map.setdefault(
                order.id,
                {
                    'id': order.id,
                    'status': order.status,
                    'shipping_address': order.shipping_address,
                    'created_at': order.created_at,
                    'updated_at': order.updated_at,
                    'customer': {
                        'id': order.user_id,
                        'username': order.user.username,
                    },
                    'items': [],
                    'total_for_store': Decimal('0.00'),
                    'total_items': 0,
                },
            )

            subtotal = item.product_price * item.quantity
            order_data['items'].append(
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'product_price': item.product_price,
                    'quantity': item.quantity,
                    'subtotal': subtotal,
                }
            )
            order_data['total_for_store'] += subtotal
            order_data['total_items'] += item.quantity

        orders = list(orders_map.values())

        sold_products = list(
            scoped_items.values('product_id', 'product_name')
            .annotate(
                units_sold=Coalesce(Sum('quantity'), 0),
                revenue=Coalesce(
                    Sum(
                        ExpressionWrapper(
                            F('product_price') * F('quantity'),
                            output_field=DecimalField(max_digits=12, decimal_places=2),
                        )
                    ),
                    Decimal('0.00'),
                ),
                orders_count=Count('order_id', distinct=True),
            )
            .order_by('-units_sold', '-revenue')[:20]
        )

        status_summary = list(
            Order.objects.filter(id__in=[order['id'] for order in orders])
            .values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return Response(
            {
                'orders': orders,
                'summary': {
                    'total_orders': len(orders),
                    'total_items_sold': sum(order['total_items'] for order in orders),
                    'total_revenue': sum(order['total_for_store'] for order in orders),
                    'status_summary': status_summary,
                },
                'sold_products': sold_products,
            }
        )

    @action(detail=True, methods=['patch'], url_path='store-status')
    def store_status(self, request, pk=None):
        user = request.user
        order = get_object_or_404(Order, pk=pk)

        is_admin = user.is_staff or user.is_superuser
        if not is_admin:
            has_access = OrderItem.objects.filter(
                order=order,
                product__store__owner=user,
            ).exists()
            if not has_access:
                return Response(
                    {'detail': 'Acesso permitido apenas para a loja do pedido.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        new_status = request.data.get('status')
        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'detail': 'Status invalido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])

        return Response(
            {
                'id': order.id,
                'status': order.status,
                'updated_at': order.updated_at,
            }
        )

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        user = request.user
        is_admin = user.is_staff or user.is_superuser

        if is_admin:
            products_qs = Product.objects.all()
            scoped_order_items = OrderItem.objects.select_related('order', 'product')
            scoped_orders = Order.objects.all()
        else:
            products_qs = Product.objects.filter(store__owner=user)
            if not products_qs.exists():
                return Response(
                    {'detail': 'Usuário sem loja para visualizar dashboard.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            scoped_order_items = OrderItem.objects.filter(
                product__store__owner=user
            ).select_related('order', 'product')
            scoped_orders = Order.objects.filter(
                id__in=scoped_order_items.values_list('order_id', flat=True)
            ).distinct()

        sale_value_expr = ExpressionWrapper(
            F('product_price') * F('quantity'),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )

        valid_sales_items = scoped_order_items.exclude(order__status='cancelled')
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=6)
        month_start = today_start - timedelta(days=29)
        previous_month_start = month_start - timedelta(days=30)

        totals = products_qs.aggregate(
            total_products=Count('id'),
            total_stock_units=Coalesce(Sum('stock'), 0),
            low_stock_count=Count('id', filter=Q(stock__gt=0, stock__lte=5)),
            out_of_stock_count=Count('id', filter=Q(stock=0)),
        )

        total_revenue = valid_sales_items.aggregate(
            revenue=Coalesce(Sum(sale_value_expr), Decimal('0.00'))
        )['revenue']

        total_units_sold = valid_sales_items.aggregate(
            units=Coalesce(Sum('quantity'), 0)
        )['units']

        stock_value_expr = ExpressionWrapper(
            F('stock') * F('price'),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        total_inventory_value = products_qs.aggregate(
            inventory_value=Coalesce(Sum(stock_value_expr), Decimal('0.00'))
        )['inventory_value']

        orders_non_cancelled = scoped_orders.exclude(status='cancelled')
        total_orders = orders_non_cancelled.count()
        cancelled_orders = scoped_orders.filter(status='cancelled').count()
        delivered_orders = scoped_orders.filter(status='delivered').count()
        pending_orders = scoped_orders.filter(status__in=['pending', 'processing']).count()
        active_customers = scoped_orders.values('user_id').distinct().count()

        cancellation_rate = 0
        delivery_rate = 0
        if scoped_orders.exists():
            cancellation_rate = (cancelled_orders / scoped_orders.count()) * 100
            delivery_rate = (delivered_orders / scoped_orders.count()) * 100

        avg_ticket = Decimal('0.00')
        if total_orders:
            avg_ticket = total_revenue / Decimal(total_orders)

        def revenue_since(start_date):
            return valid_sales_items.filter(
                order__created_at__gte=start_date
            ).aggregate(total=Coalesce(Sum(sale_value_expr), Decimal('0.00')))['total']

        def orders_since(start_date):
            return scoped_orders.exclude(status='cancelled').filter(
                created_at__gte=start_date
            ).count()

        cashflow = {
            'today': {
                'revenue': revenue_since(today_start),
                'orders': orders_since(today_start),
            },
            'last_7_days': {
                'revenue': revenue_since(week_start),
                'orders': orders_since(week_start),
            },
            'last_30_days': {
                'revenue': revenue_since(month_start),
                'orders': orders_since(month_start),
            },
        }

        current_30_revenue = revenue_since(month_start)
        previous_30_revenue = revenue_since(previous_month_start)
        previous_30_revenue = previous_30_revenue - current_30_revenue

        current_30_orders = orders_since(month_start)
        previous_30_orders = orders_since(previous_month_start) - current_30_orders

        def growth_rate(current_value, previous_value):
            if previous_value <= 0:
                return 100 if current_value > 0 else 0
            return float(((current_value - previous_value) / previous_value) * 100)

        period_comparison = {
            'current_30_days': {
                'revenue': current_30_revenue,
                'orders': current_30_orders,
            },
            'previous_30_days': {
                'revenue': previous_30_revenue,
                'orders': previous_30_orders,
            },
            'growth': {
                'revenue_pct': growth_rate(current_30_revenue, previous_30_revenue),
                'orders_pct': growth_rate(current_30_orders, previous_30_orders),
            },
        }

        status_distribution = list(
            scoped_orders.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        top_products = list(
            valid_sales_items.values('product_id', 'product_name')
            .annotate(
                units_sold=Coalesce(Sum('quantity'), 0),
                revenue=Coalesce(Sum(sale_value_expr), Decimal('0.00')),
                orders_count=Count('order_id', distinct=True),
            )
            .order_by('-units_sold', '-revenue')[:10]
        )

        stock_by_category = list(
            products_qs.values('category__name')
            .annotate(
                products_count=Count('id'),
                total_stock=Coalesce(Sum('stock'), 0),
                avg_price=Coalesce(Avg('price'), Decimal('0.00')),
            )
            .order_by('-total_stock', 'category__name')
        )

        low_stock_products = list(
            products_qs.filter(stock__lte=5)
            .values('id', 'name', 'stock', 'price', 'available')
            .order_by('stock', 'name')[:15]
        )

        products_with_sales = list(
            valid_sales_items.values('product_id').distinct().values_list('product_id', flat=True)
        )
        unsold_products = list(
            products_qs.exclude(id__in=products_with_sales)
            .values('id', 'name', 'stock', 'price', 'created_at')
            .order_by('-stock', 'name')[:12]
        )

        sales_grouped = list(
            valid_sales_items.filter(order__created_at__gte=month_start)
            .annotate(day=TruncDate('order__created_at'))
            .values('day')
            .annotate(
                revenue=Coalesce(Sum(sale_value_expr), Decimal('0.00')),
                units_sold=Coalesce(Sum('quantity'), 0),
                orders_count=Count('order_id', distinct=True),
            )
            .order_by('day')
        )

        sales_map = {
            row['day'].isoformat(): {
                'revenue': row['revenue'],
                'units_sold': row['units_sold'],
                'orders_count': row['orders_count'],
            }
            for row in sales_grouped
        }

        sales_by_weekday = list(
            valid_sales_items.filter(order__created_at__gte=month_start)
            .annotate(weekday=ExtractWeekDay('order__created_at'))
            .values('weekday')
            .annotate(
                revenue=Coalesce(Sum(sale_value_expr), Decimal('0.00')),
                units_sold=Coalesce(Sum('quantity'), 0),
            )
            .order_by('weekday')
        )

        weekday_map = {row['weekday']: row for row in sales_by_weekday}
        weekday_labels = {
            1: 'Dom',
            2: 'Seg',
            3: 'Ter',
            4: 'Qua',
            5: 'Qui',
            6: 'Sex',
            7: 'Sab',
        }
        weekday_sales = []
        for index in range(1, 8):
            row = weekday_map.get(index)
            weekday_sales.append(
                {
                    'weekday': index,
                    'label': weekday_labels[index],
                    'revenue': row['revenue'] if row else Decimal('0.00'),
                    'units_sold': row['units_sold'] if row else 0,
                }
            )

        category_sales = list(
            valid_sales_items.values('product__category__name')
            .annotate(
                revenue=Coalesce(Sum(sale_value_expr), Decimal('0.00')),
                units_sold=Coalesce(Sum('quantity'), 0),
            )
            .order_by('-revenue')[:8]
        )

        sales_timeline = []
        for index in range(30):
            current_day = (month_start + timedelta(days=index)).date()
            key = current_day.isoformat()
            day_row = sales_map.get(
                key,
                {'revenue': Decimal('0.00'), 'units_sold': 0, 'orders_count': 0},
            )
            sales_timeline.append(
                {
                    'day': key,
                    'revenue': day_row['revenue'],
                    'units_sold': day_row['units_sold'],
                    'orders_count': day_row['orders_count'],
                }
            )

        recent_orders = list(
            scoped_orders.order_by('-created_at')
            .values('id', 'status', 'total_price', 'created_at')[:8]
        )

        return Response(
            {
                'scope': 'admin' if is_admin else 'store_owner',
                'summary': {
                    'total_products': totals['total_products'],
                    'total_stock_units': totals['total_stock_units'],
                    'low_stock_count': totals['low_stock_count'],
                    'out_of_stock_count': totals['out_of_stock_count'],
                    'total_orders': total_orders,
                    'total_units_sold': total_units_sold,
                    'total_revenue': total_revenue,
                    'avg_ticket': avg_ticket,
                },
                'business_health': {
                    'inventory_value': total_inventory_value,
                    'active_customers': active_customers,
                    'cancelled_orders': cancelled_orders,
                    'pending_orders': pending_orders,
                    'delivery_rate': round(delivery_rate, 2),
                    'cancellation_rate': round(cancellation_rate, 2),
                    'unsold_products_count': len(unsold_products),
                },
                'cashflow': cashflow,
                'period_comparison': period_comparison,
                'status_distribution': status_distribution,
                'top_products': top_products,
                'stock_by_category': stock_by_category,
                'low_stock_products': low_stock_products,
                'unsold_products': unsold_products,
                'sales_timeline': sales_timeline,
                'weekday_sales': weekday_sales,
                'category_sales': category_sales,
                'recent_orders': recent_orders,
            }
        )
