import Header from '@/components/Header';
import Link from 'next/link';
import UserResearchPoll from '@/components/UserResearchPoll';

export default function ContactPage() {
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
                  Contact Us
                </h1>
              </div>
            </div>
            
            {/* Content section */}
            <div className="p-6 md:p-8 lg:p-10">
              <div className="prose prose-lg max-w-none">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Get In Touch</h3>
                <p className="mb-6">
                  We welcome your questions, feedback, and collaboration opportunities. The Cal BioScape team is committed to advancing 
                  the circular bioeconomy in California&apos;s Northern San Joaquin Valley and we&apos;re eager to connect with stakeholders, 
                  researchers, and community members.
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-md mb-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-blue-800">Email</h3>
                      <p className="mt-2 text-blue-700">
                        <a href="mailto:calbioscape@gmail.com" className="hover:underline">calbioscape@gmail.com</a>
                      </p>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-700 mb-3">How We Can Help</h3>
                <ul className="list-disc pl-6 mb-6">
                  <li className="mb-2">
                    <span className="font-medium">Data Questions</span> - Inquiries about our datasets, methodologies, or data sources
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">Partnership Opportunities</span> - Collaboration on research, development, or implementation projects
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">Feature Requests</span> - Suggestions for new features or improvements to Cal BioScape
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">Technical Support</span> - Assistance with using the platform or API (when available)
                  </li>
                </ul>
                
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Response Time</h3>
                <p className="mb-6">
                  We strive to respond to all inquiries within 2-3 business days. For urgent matters, please indicate so in your 
                  email subject line.
                </p>
                <div className="border-t border-gray-200 pt-5">
                  <h3 className="mb-2 text-lg font-semibold text-gray-700">Help shape Cal BioScape</h3>
                  <p className="mb-3 text-sm text-gray-600">Tell us about your work and what you hope to accomplish with the tool.</p>
                  <UserResearchPoll variant="link" />
                </div>
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
        <div className="mt-2 text-center">
          <Link href="/admin" className="rounded text-xs text-gray-500 hover:text-gray-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Team admin</Link>
        </div>
      </footer>
    </div>
  );
}
