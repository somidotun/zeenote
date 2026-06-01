import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zeenote',
  description: 'Build complex database queries visually with nested conditions, live preview, and query execution.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
