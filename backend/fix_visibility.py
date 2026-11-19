import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from store.models import Product

print('=== Status Atual dos Produtos ===')
for p in Product.objects.all():
    print(f'ID: {p.id:2d} | {p.name:20s} | Featured: {str(p.featured):5s} | Visible: {p.visible}')

print('\n=== Tornando todos os produtos visíveis ===')
Product.objects.all().update(visible=True)

print('\n=== Status Após Atualização ===')
for p in Product.objects.all():
    print(f'ID: {p.id:2d} | {p.name:20s} | Featured: {str(p.featured):5s} | Visible: {p.visible}')

print('\n=== Resumo ===')
print(f'Total de produtos: {Product.objects.count()}')
print(f'Produtos featured: {Product.objects.filter(featured=True).count()}')
print(f'Produtos featured E visíveis: {Product.objects.filter(featured=True, visible=True).count()}')
print('\nProdutos que aparecerão no slider:')
for p in Product.objects.filter(featured=True, visible=True):
    print(f'  - {p.name}')
