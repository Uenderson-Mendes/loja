from rest_framework import serializers
from .models import Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Store
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction


class StoreSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Store
        fields = ['id', 'name', 'description', 'owner', 'owner_name', 'address', 
                  'phone', 'email', 'active', 'created_at', 'updated_at']
        read_only_fields = ['owner']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'order', 'created_at']


class ProductSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )

    store_name = serializers.CharField(
        source='store.name',
        read_only=True
    )

    images = ProductImageSerializer(many=True, read_only=True)

    # 👇 CAMPO PARA RECEBER GALERIA
    gallery = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'category',
            'category_name',
            'store',
            'store_name',
            'image',
            'images',
            'gallery',   # 🔥 IMPORTANTE
            'stock',
            'available',
            'featured',
            'visible',
            'created_at',
            'updated_at'
        ]

    def _get_request_gallery_images(self):
        request = self.context.get('request')
        if not request:
            return []

        # Compatibilidade com o frontend atual (images[]) e payloads alternativos.
        return (
            request.FILES.getlist('gallery')
            or request.FILES.getlist('images[]')
            or request.FILES.getlist('images')
        )

    def _save_gallery_images(self, product, images):
        for order, image in enumerate(images):
            ProductImage.objects.create(product=product, image=image, order=order)

    def validate(self, attrs):
        incoming_images = attrs.get('gallery', [])

        if not incoming_images:
            incoming_images = self._get_request_gallery_images()

        existing_count = self.instance.images.count() if self.instance else 0
        total_count = existing_count + len(incoming_images)

        if total_count > 5:
            raise serializers.ValidationError(
                {'gallery': 'Máximo de 5 imagens na galeria por produto.'}
            )

        return attrs

    def create(self, validated_data):
        gallery_images = validated_data.pop('gallery', [])

        if not gallery_images:
            gallery_images = self._get_request_gallery_images()

        with transaction.atomic():
            product = Product.objects.create(**validated_data)
            if gallery_images:
                self._save_gallery_images(product, gallery_images)

        return product

    def update(self, instance, validated_data):
        gallery_images = validated_data.pop('gallery', [])

        if not gallery_images:
            gallery_images = self._get_request_gallery_images()

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if gallery_images:
                start_order = instance.images.count()
                for idx, image in enumerate(gallery_images):
                    ProductImage.objects.create(
                        product=instance,
                        image=image,
                        order=start_order + idx,
                    )

        return instance

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, 
                                              decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_price', 'product_image',
                  'quantity', 'subtotal', 'added_at']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_items = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_price', 'total_items', 'created_at', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'username', 'status', 'total_price', 'shipping_address',
                  'items', 'created_at', 'updated_at']
        read_only_fields = ['user']


class OrderCreateSerializer(serializers.Serializer):
    shipping_address = serializers.CharField()

    def create(self, validated_data):
        user = self.context['request'].user
        with transaction.atomic():
            cart = Cart.objects.select_for_update().get(user=user)
            cart_items = list(
                cart.items.select_related('product').select_for_update()
            )

            if not cart_items:
                raise serializers.ValidationError("Carrinho vazio")

            # Garantir estoque suficiente para todos os itens antes de criar o pedido.
            for cart_item in cart_items:
                if cart_item.product.stock < cart_item.quantity:
                    raise serializers.ValidationError(
                        f"Estoque insuficiente para {cart_item.product.name}"
                    )

            order = Order.objects.create(
                user=user,
                total_price=cart.total_price,
                shipping_address=validated_data['shipping_address']
            )

            for cart_item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    product_name=cart_item.product.name,
                    product_price=cart_item.product.price,
                    quantity=cart_item.quantity
                )

                cart_item.product.stock -= cart_item.quantity
                if cart_item.product.stock == 0:
                    cart_item.product.available = False
                cart_item.product.save(update_fields=['stock', 'available'])

                cache.delete(f'product_{cart_item.product.id}')

            cache.delete('product_list')
            cart.items.all().delete()

            return order
