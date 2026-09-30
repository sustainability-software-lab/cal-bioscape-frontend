# Cal BioScape Frontend

This is the frontend for the Cal BioScape Siting Tool, a web-based application for analyzing and visualizing biomass and circular economy resource data. It is built with [Next.js](https://nextjs.org).

## Staging Site

The staging site for this project can be found at [staging.calbioscape.org](https://staging.calbioscape.org).

## User research admin

Developers can review collected responses at [production admin](https://calbioscape.org/admin) or [staging admin](https://staging.calbioscape.org/admin). The username is `admin`; each environment has its own password in Google Secret Manager in project `biocirv-470318`.

See [the admin access and storage guide](docs/USER_RESEARCH.md) for the exact password-retrieval command, required access, private response bucket locations, CSV export, credential rotation, and troubleshooting.

## Getting Started

First, install the dependencies:
```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## About The Project

The Cal BioScape Siting Tool provides an interactive map interface to help users identify suitable locations for bioenergy and biomanufacturing facilities. It allows for the visualization of various data layers, analysis of siting constraints, and inventory assessment.

## Built With

*   [Next.js](https://nextjs.org/)
*   [React](https://reactjs.org/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
*   [Tailwind CSS](https://tailwindcss.com/)
