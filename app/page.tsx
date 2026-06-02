'use client';

import dynamic from 'next/dynamic';

const QueryBuilder = dynamic(
  () => import('./components/query-builder/QueryBuilder').then((mod) => mod.QueryBuilder),
  { ssr: false }
);

export default function Home() {
  return <QueryBuilder />;
}
