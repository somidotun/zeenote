import type { Schema, MockDataRecord } from '../types/query';

export const SCHEMAS: Schema[] = [
  {
    id: 'users',
    name: 'Users',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'country', label: 'Country', type: 'enum', enumValues: ['Nigeria', 'Kenya', 'Ghana', 'South Africa', 'USA', 'UK', 'Canada', 'Germany'] },
      { key: 'status', label: 'Status', type: 'enum', enumValues: ['active', 'inactive', 'pending', 'banned'] },
      { key: 'role', label: 'Role', type: 'enum', enumValues: ['admin', 'user', 'moderator', 'viewer'] },
      { key: 'purchases', label: 'Purchases', type: 'number' },
      { key: 'verified', label: 'Verified', type: 'boolean' },
      { key: 'createdAt', label: 'Created At', type: 'date' },
      { key: 'tags', label: 'Tags', type: 'array' },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'name', label: 'Product Name', type: 'string' },
      { key: 'category', label: 'Category', type: 'enum', enumValues: ['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Home'] },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'rating', label: 'Rating', type: 'number' },
      { key: 'inStock', label: 'In Stock', type: 'boolean' },
      { key: 'brand', label: 'Brand', type: 'string' },
      { key: 'createdAt', label: 'Created At', type: 'date' },
      { key: 'sku', label: 'SKU', type: 'string' },
    ],
  },
  {
    id: 'orders',
    name: 'Orders',
    fields: [
      { key: 'id', label: 'Order ID', type: 'number' },
      { key: 'userId', label: 'User ID', type: 'number' },
      { key: 'status', label: 'Status', type: 'enum', enumValues: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] },
      { key: 'total', label: 'Total ($)', type: 'number' },
      { key: 'items', label: 'Item Count', type: 'number' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'enum', enumValues: ['card', 'paypal', 'crypto', 'bank_transfer'] },
      { key: 'country', label: 'Ship-to Country', type: 'enum', enumValues: ['Nigeria', 'Kenya', 'Ghana', 'South Africa', 'USA', 'UK', 'Canada', 'Germany'] },
      { key: 'createdAt', label: 'Order Date', type: 'date' },
      { key: 'express', label: 'Express Shipping', type: 'boolean' },
    ],
  },
];

function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    .toISOString().split('T')[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockData(schemaId: string, count = 200): MockDataRecord[] {
  if (schemaId === 'users') {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: pick(['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
                   'Kemi', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rachel', 'Sam', 'Tina']),
      email: `user${i + 1}@example.com`,
      age: Math.floor(Math.random() * 50) + 18,
      country: pick(['Nigeria', 'Kenya', 'Ghana', 'South Africa', 'USA', 'UK', 'Canada', 'Germany']),
      status: pick(['active', 'inactive', 'pending', 'banned']),
      role: pick(['admin', 'user', 'moderator', 'viewer']),
      purchases: Math.floor(Math.random() * 50),
      verified: Math.random() > 0.4,
      createdAt: randomDate(new Date('2020-01-01'), new Date('2024-12-31')),
      tags: Math.random() > 0.5 ? pick([['vip', 'beta'], ['newsletter'], ['premium', 'trial'], []]) : [],
    }));
  }
  if (schemaId === 'products') {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      category: pick(['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Home']),
      price: parseFloat((Math.random() * 500 + 5).toFixed(2)),
      stock: Math.floor(Math.random() * 200),
      rating: parseFloat((Math.random() * 3 + 2).toFixed(1)),
      inStock: Math.random() > 0.2,
      brand: pick(['BrandA', 'BrandB', 'BrandC', 'BrandD', 'BrandE']),
      createdAt: randomDate(new Date('2022-01-01'), new Date('2024-12-31')),
      sku: `SKU-${1000 + i}`,
    }));
  }
  // orders
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    userId: Math.floor(Math.random() * 100) + 1,
    status: pick(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
    total: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
    items: Math.floor(Math.random() * 10) + 1,
    paymentMethod: pick(['card', 'paypal', 'crypto', 'bank_transfer']),
    country: pick(['Nigeria', 'Kenya', 'Ghana', 'South Africa', 'USA', 'UK', 'Canada', 'Germany']),
    createdAt: randomDate(new Date('2023-01-01'), new Date('2024-12-31')),
    express: Math.random() > 0.6,
  }));
}
