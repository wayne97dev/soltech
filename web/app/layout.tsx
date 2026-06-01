import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SolTech VPN — the private network you own',
  description:
    'Fast, encrypted, no-logs VPN, free for holders of the SolTech token on Solana. Hold the token, own the network.',
};

export const viewport: Viewport = {
  themeColor: '#06070a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
