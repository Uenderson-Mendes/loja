from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm
from django import forms
from .models import Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Store


class StoreCreationForm(forms.ModelForm):
    """Formulário para criar loja com novo usuário automaticamente"""
    # Campos do usuário (obrigatórios ao criar loja)
    username = forms.CharField(
        max_length=150,
        label='Nome de usuário (login)',
        help_text='Nome de login do proprietário da loja'
    )
    password1 = forms.CharField(
        widget=forms.PasswordInput,
        label='Senha',
        help_text='Senha para o usuário da loja'
    )
    password2 = forms.CharField(
        widget=forms.PasswordInput,
        label='Confirmar senha',
        help_text='Digite a mesma senha novamente'
    )
    email_user = forms.EmailField(
        label='Email do usuário',
        help_text='Email de login do proprietário'
    )
    first_name = forms.CharField(
        max_length=150,
        label='Nome',
        help_text='Nome do proprietário'
    )
    last_name = forms.CharField(
        max_length=150,
        label='Sobrenome',
        help_text='Sobrenome do proprietário'
    )
    
    class Meta:
        model = Store
        exclude = ['owner']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Se estiver editando, remover campos de usuário
        if self.instance.pk:
            self.fields.pop('username', None)
            self.fields.pop('password1', None)
            self.fields.pop('password2', None)
            self.fields.pop('email_user', None)
            self.fields.pop('first_name', None)
            self.fields.pop('last_name', None)
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validar apenas ao criar nova loja
        if not self.instance.pk:
            username = cleaned_data.get('username')
            password1 = cleaned_data.get('password1')
            password2 = cleaned_data.get('password2')
            email_user = cleaned_data.get('email_user')
            
            if not username:
                raise forms.ValidationError('Nome de usuário é obrigatório')
            if not password1:
                raise forms.ValidationError('Senha é obrigatória')
            if password1 != password2:
                raise forms.ValidationError('As senhas não coincidem')
            if User.objects.filter(username=username).exists():
                raise forms.ValidationError(f'Usuário "{username}" já existe')
            if email_user and User.objects.filter(email=email_user).exists():
                raise forms.ValidationError(f'Email "{email_user}" já está em uso')
        
        return cleaned_data
    
    def save(self, commit=True):
        store = super().save(commit=False)
        
        # Criar novo usuário apenas ao criar loja nova
        if not self.instance.pk:
            user = User.objects.create_user(
                username=self.cleaned_data['username'],
                email=self.cleaned_data['email_user'],
                password=self.cleaned_data['password1'],
                first_name=self.cleaned_data['first_name'],
                last_name=self.cleaned_data['last_name']
            )
            store.owner = user
        
        if commit:
            store.save()
        return store


class StoreInline(admin.TabularInline):
    model = Store
    extra = 0
    fields = ['name', 'description', 'address', 'phone', 'email', 'active']
    can_delete = False


class StoreOwnerAdmin(BaseUserAdmin):
    """Admin customizado para gerenciar usuários e suas lojas"""
    inlines = [StoreInline]
    
    def get_inline_instances(self, request, obj=None):
        """Mostra inline de Store apenas se o usuário já existe"""
        if obj is None:
            return []
        return super().get_inline_instances(request, obj)
    
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'get_stores']
    
    def get_stores(self, obj):
        stores = Store.objects.filter(owner=obj)
        if stores.exists():
            return ', '.join([s.name for s in stores])
        return '-'
    get_stores.short_description = 'Lojas'


# Desregistra o User padrão e registra o customizado
admin.site.unregister(User)
admin.site.register(User, StoreOwnerAdmin)


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    form = StoreCreationForm
    list_display = ['name', 'owner', 'phone', 'active', 'created_at']
    list_filter = ['active', 'created_at']
    search_fields = ['name', 'owner__username', 'email']
    list_editable = ['active']
    
    fieldsets = (
        ('Dados do Usuário Proprietário da Loja', {
            'fields': ('username', 'password1', 'password2', 'email_user', 'first_name', 'last_name'),
            'description': 'Dados de login do proprietário da loja'
        }),
        ('Informações da Loja', {
            'fields': ('name', 'description', 'address', 'phone', 'email', 'active')
        }),
    )
    
    def get_fieldsets(self, request, obj=None):
        """Ao editar, mostra apenas os dados da loja"""
        if obj:  # Editando loja existente
            return (
                ('Proprietário Atual', {
                    'fields': ('owner',),
                    'description': f'Proprietário: {obj.owner.username}'
                }),
                ('Informações da Loja', {
                    'fields': ('name', 'description', 'address', 'phone', 'email', 'active')
                }),
            )
        return super().get_fieldsets(request, obj)
    
    def get_readonly_fields(self, request, obj=None):
        """Torna owner readonly ao editar"""
        if obj:
            return ['owner']
        return []
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Mostra apenas usuários que ainda não são staff no campo owner"""
        if db_field.name == "owner":
            kwargs["queryset"] = User.objects.filter(is_staff=False)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'order']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'store', 'category', 'price', 'stock', 'available', 'created_at']
    list_filter = ['store', 'category', 'available', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['price', 'stock', 'available']
    inlines = [ProductImageInline]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'order', 'created_at']
    list_filter = ['product', 'created_at']


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_items', 'total_price', 'updated_at']
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'product_price', 'quantity', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total_price', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'shipping_address']
    list_editable = ['status']
    inlines = [OrderItemInline]
