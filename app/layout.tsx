import type { ReactNode } from 'react';

export const metadata = {
  title: 'Project Site Analysis Tool',
  description:
    'Johinke Development presents a planning intelligence tool for rapid property site selection.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
