import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'RUPTUREMAP — Map the consequences.',
  description: 'An interactive resilience laboratory. Explore hidden dependencies, inject disruptions and compare recovery scenarios.',
  applicationName: 'RUPTUREMAP',
  openGraph: { title: 'RUPTUREMAP | See what breaks next.', description: 'A living resilience simulator for connected systems.', type: 'website' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
