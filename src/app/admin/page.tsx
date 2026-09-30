import type { Metadata } from 'next';
import Header from '@/components/Header';
import ResearchAdmin from '@/components/ResearchAdmin';

export const metadata: Metadata = {
  title: 'Team admin | Cal BioScape',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <div className="min-h-screen overflow-y-auto bg-gray-50"><Header /><ResearchAdmin /></div>;
}
