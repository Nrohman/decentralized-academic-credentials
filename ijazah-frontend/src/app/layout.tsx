import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Portal Ijazah Digital Blockchain',
  description: 'Sistem Penerbitan & Verifikasi Ijazah Digital Menggunakan Teknologi Blockchain Polygon',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-white dark:bg-[#050511] text-slate-900 dark:text-slate-200 antialiased font-sans transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
