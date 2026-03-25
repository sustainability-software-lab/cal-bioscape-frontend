import Header from '@/components/Header';
import Link from 'next/link';

export default function ApiPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-y-auto">
      <Header />
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Hero section with image */}
            <div className="relative h-16 md:h-20 lg:h-24 bg-gradient-to-r from-green-800 to-blue-700">
              <div className="absolute inset-0 bg-black opacity-30"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="text-2xl md:text-3xl font-bold text-white text-center px-4">
                  API
                </h1>
              </div>
            </div>
            
            {/* Content section */}
            <div className="p-6 md:p-8 lg:p-10">
              <div className="prose prose-lg max-w-none">
                {/* Info box */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-md mb-8">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-blue-800">API currently under development, coming soon.</h3>
                      <p className="mt-2 text-blue-700">
                        Our team is working on building a comprehensive API for programmatic access to Cal BioScape data.
                        Please check back later for documentation and access information.
                      </p>
                      <p className="mt-3">
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api-staging.calbioscape.org'}/docs`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          View API Documentation →
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Planned Features</h3>
                <ul className="list-disc pl-6 mb-6">
                  <li className="mb-2">
                    <span className="font-medium">RESTful Endpoints</span> - Access to biomass feedstock data, infrastructure information, and more
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">Geospatial Queries</span> - Filter data based on location, proximity, and spatial relationships
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">Authentication System</span> - Secure access with API keys for registered users
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">Comprehensive Documentation</span> - Detailed guides and examples for integration
                  </li>
                </ul>
                
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Interested?</h3>
                <p className="mb-6">
                  If you&apos;re interested in being notified when our API becomes available, please <Link href="/contact" className="text-blue-600 hover:text-blue-800 underline">contact us</Link>.
                  We welcome collaboration with researchers, developers, and organizations interested in advancing California&apos;s bioeconomy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 shadow-sm text-gray-800 py-2 px-4">
        <div className="max-w-4xl mx-auto text-center flex items-center justify-center">
          <p className="text-sm mr-2">&copy; {new Date().getFullYear()} Cal BioScape</p>
          <span className="text-gray-400 mx-1">|</span>
          <p className="text-xs text-gray-500">A collaborative effort to transform agricultural waste into sustainable resources</p>
        </div>
      </footer>
    </div>
  );
}
