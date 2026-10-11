import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DashboardShell } from '../components/DashboardShell';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prospera Corporate Referral Platform',
  description:
    'Institutional B2B and B2C Referral & Commission Management Platform for the UAE and Middle East.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}

