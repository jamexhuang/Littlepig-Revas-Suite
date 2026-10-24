import './globals.css';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@/i18n/I18nContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Revas Suite',
    description: 'Purchasing and Analyzer Suite',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <I18nProvider>
                    {children}
                </I18nProvider>
            </body>
        </html>
    );
}
