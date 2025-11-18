import Header from '@/components/Header';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
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
                  About Cal BioScape
                </h1>
              </div>
            </div>

            {/* Content section */}
            <div className="p-6 md:p-8 lg:p-10">
              <div className="prose prose-lg max-w-none">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Project Vision
                </h3>
                <p className="mb-6">
                  The{" "}
                  <Link
                    href="https://www.beamcircular.org/news-updates/welcome-to-the-biocircular-valley-virtual-institute-on-feedstocks-of-the-future"
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BioCircular Valley initiative
                  </Link>{" "}
                  is a strategic effort to cultivate a thriving circular
                  bioeconomy within California&apos;s Northern San Joaquin
                  Valley (NSJV), specifically encompassing San Joaquin,
                  Stanislaus, and Merced counties. Our core vision is to
                  transform the region&apos;s abundant but often underutilized
                  agricultural waste streams—including crop residues and food
                  processing byproducts like almond shells, fruit peels, and
                  orchard trimmings—into valuable bioproducts, sustainable
                  biofuels, and advanced materials.
                </p>

                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Tool Purpose
                </h3>
                <p className="mb-6">
                  The Cal BioScape tool is a publicly accessible,
                  data-intensive, web-based platform centered around a
                  user-friendly interactive map and comprehensive database. Its
                  primary purpose is to visualize, integrate, and analyze data
                  critical to the NSJV bioeconomy, thereby supporting informed
                  decision-making by key stakeholders including:
                </p>

                <ul className="list-disc pl-6 mb-6">
                  <li className="mb-2">
                    <span className="font-medium">Feedstock Suppliers</span> -
                    Farmers and agricultural producers seeking economically
                    viable and environmentally sound alternatives to current
                    waste management practices
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">
                      Biomanufacturing Companies
                    </span>{" "}
                    - Businesses considering establishing or expanding
                    operations within the NSJV, requiring reliable data on
                    feedstock availability, quality, and regional infrastructure
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">
                      Policymakers & Community Leaders
                    </span>{" "}
                    - Officials and organizations needing data to understand the
                    scale and potential of the regional bioeconomy for
                    development initiatives
                  </li>
                  <li className="mb-2">
                    <span className="font-medium">
                      Researchers & Scientists
                    </span>{" "}
                    - Academics focused on advancing biomass conversion,
                    feedstock characterization, and bioeconomy modeling
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Key Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Interactive Geospatial Visualization
                    </h4>
                    <p className="text-gray-600">
                      Explore feedstock locations, infrastructure, and
                      environmental factors through an intuitive map interface.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Comprehensive Data Integration
                    </h4>
                    <p className="text-gray-600">
                      Access detailed information on agricultural waste
                      feedstocks, transportation networks, and industrial
                      facilities.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Advanced Filtering & Analysis
                    </h4>
                    <p className="text-gray-600">
                      Filter data by type, location, composition, and perform
                      spatial queries to identify opportunities.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-medium text-gray-800 mb-2">
                      API Access
                    </h4>
                    <p className="text-gray-600">
                      Programmatic data retrieval for researchers and partner
                      organizations to build integrated solutions. (Currently
                      under development)
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Benefits
                </h3>
                <p className="mb-6">
                  By providing comprehensive data on feedstock availability,
                  quality, and logistical considerations alongside relevant
                  infrastructure and constraints, the Cal BioScape tool aims to
                  reduce uncertainty and de-risk investment and operational
                  decisions. This positioning makes the tool not only a data
                  repository, but a catalyst for developing the bioeconomy
                  within the Northern San Joaquin Valley.
                </p>

                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Project Partners
                </h3>
                <p className="mb-6">
                  The BioCircular Valley initiative is a collaborative effort
                  involving key research institutions (Department of
                  Energy&apos;s Lawrence Berkeley National Laboratory, UC
                  Berkeley, UC Merced, UC Agriculture and Natural Resources,
                  USDA Albany Agricultural Research Station), industry partners
                  (Almond Board of California), and regional economic
                  development organizations (BEAM Circular), funded [in part] through 
                  Schmidt Sciences&apos; Virtual Institute on Feedstocks of the Future, 
                  with support from the Foundation for Food &amp; Agriculture Research, 
                  and technical support from Schmidt Sciences&apos; Virtual Institute for 
                  Scientific Software at the University of Washington.
                </p>

                <div className="mt-10 mb-8">
                  <h4 className="text-lg font-medium text-center text-gray-700 mb-6">
                    Supported by
                  </h4>
                  <div className="flex flex-wrap justify-center items-center w-full gap-8">
                    <div className="flex flex-col items-center">
                      <Image
                        src="/berkeley lab_logo_white_bg.png"
                        alt="Berkeley Lab"
                        width={180}
                        height={60}
                        className="h-auto"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <Image
                        src="/uc_berkeley_logo.png"
                        alt="UC Berkeley"
                        width={180}
                        height={60}
                        className="h-auto"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <Image
                        src="/biocirv_official_logo.png"
                        alt="Biocirv"
                        width={180}
                        height={60}
                        className="h-auto"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <Image
                        src="/BEAM_Logo_H1-blue_dark.png"
                        alt="BEAM Circular"
                        width={190}
                        height={65}
                        className="h-auto"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <Image
                        src="/ssec_logo.png"
                        alt="Scientific Software Engineering Center"
                        width={100}
                        height={35}
                        className="h-auto"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <Image
                        src="/schmidtsciences_primary_color-1.png"
                        alt="Schmidt Sciences"
                        width={180}
                        height={60}
                        className="h-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 shadow-sm text-gray-800 py-2 px-4">
        <div className="max-w-4xl mx-auto text-center flex items-center justify-center">
          <p className="text-sm mr-2">
            &copy; {new Date().getFullYear()} Cal BioScape
          </p>
          <span className="text-gray-400 mx-1">|</span>
          <p className="text-xs text-gray-500">
            A collaborative effort to transform agricultural waste into
            sustainable resources
          </p>
        </div>
      </footer>
    </div>
  );
}
