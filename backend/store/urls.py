from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, ProductImageViewSet, CartViewSet, OrderViewSet, StoreViewSet

router = DefaultRouter()
router.register('stores', StoreViewSet)
router.register('categories', CategoryViewSet)
router.register('products', ProductViewSet)
router.register('product-images', ProductImageViewSet)
router.register('cart', CartViewSet, basename='cart')
router.register('orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
