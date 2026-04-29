import Header from '@/components/Header';

const API_DOCS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.calbioscape.org'}/docs`;

export default function ApiPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header />

      <main className="flex-1 overflow-hidden">
        <iframe
          src={API_DOCS_URL}
          className="w-full h-full border-0"
          title="API Documentation"
        />
      </main>

      <footer className="bg-white border-t border-gray-200 shadow-sm text-gray-800 py-2 px-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto text-center flex items-center justify-center">
          <p className="text-sm mr-2">&copy; {new Date().getFullYear()} Cal BioScape</p>
          <span className="text-gray-400 mx-1">|</span>
          <p className="text-xs text-gray-500">A collaborative effort to transform agricultural waste into sustainable resources</p>
        </div>
      </footer>
    </div>
  );
}
