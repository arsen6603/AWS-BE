export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

export const products: Product[] = [
  {
    id: '1',
    title: 'iPhone 15 Pro',
    description: 'Latest Apple flagship smartphone',
    price: 999,
    count: 50,
  },
  {
    id: '2',
    title: 'Samsung Galaxy S24',
    description: 'Samsung flagship with AI features',
    price: 899,
    count: 30,
  },
  {
    id: '3',
    title: 'MacBook Pro 14"',
    description: 'Apple M3 Pro chip laptop',
    price: 1999,
    count: 20,
  },
  {
    id: '4',
    title: 'Sony WH-1000XM5',
    description: 'Premium noise-cancelling headphones',
    price: 349,
    count: 100,
  },
  {
    id: '5',
    title: 'iPad Air M2',
    description: 'Powerful and portable tablet',
    price: 599,
    count: 40,
  },
];
