import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SolTech VPN — la rete privata che possiedi',
  description:
    'VPN veloce, cifrata e senza log, gratuita per gli holder del token SolTech su Solana. Tieni il token, hai la rete.',
};

export const viewport: Viewport = {
  themeColor: '#06070a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
