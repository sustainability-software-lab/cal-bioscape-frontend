# Data Pipeline Architecture

This document outlines the architecture for a new data pipeline that extracts data from a Google Sheet, manipulates the data using Python and Pandas, and generates a final dataset to be rendered in the tool.

## 1. Directory Structure

We propose the following directory structure:

*   **`scripts/`**: This directory will be created at the project root.
    *   It will house the data fetching and processing script (`fetch-tomato-processor-facilities.ts`).
    *   **Justification**: Placing build-time or development scripts in a root-level `scripts` directory is a common convention. It clearly separates them from the frontend source code (`src`), keeping the concerns of the application and the data pipeline distinct.

*   **`src/data/`**: This directory will be created within the `src` directory.
    *   The final, processed JSON data file (e.g., `sheet-data.json`) will be stored here.
    *   **Justification**: Storing the static data within `src` allows it to be easily imported into our Next.js components like any other module. This is a clean and efficient way to make the data available to the application. The alternative, `public/data`, is better suited for assets that need to be publicly accessible via a URL, which is not the primary use case here.

## 2. Dependencies

The following Node.js packages will be required to interact with the Google Sheets API and manipulate data:

*   **`googleapis`**: The official Google API client library for Node.js. This will be used to make requests to the Google Sheets API.
*   **`dotenv`**: Loads environment variables from a .env file.
*   **`axios`**: Promise based HTTP client for the browser and node.js

These will be installed as development dependencies, as they are only needed for the data fetching script and not for the runtime of the production application.

## 3. Authentication

A secure method for handling Google API credentials will be implemented as follows:

1.  **Service Account**: A Google Cloud Platform (GCP) service account will be created with permissions to read the specified Google Sheet.
2.  **Credentials File**: The JSON key file for the service account will be obtained from GCP.
3.  **`.env` File**: The contents of the JSON key file will be stored in a `.env` file at the project root. This file will be added to `.gitignore` to prevent the credentials from being committed to version control.
4.  **Environment Variables**: The script will use a library like `dotenv` to load the credentials from the `.env` file into environment variables at runtime. The `google-auth-library` will then use these variables to authenticate with the Google Sheets API.

This approach ensures that our credentials are kept secure and are not exposed in the codebase.

## 4. Execution

The TypeScript script will be executed using the following command:

```bash
npx ts-node scripts/fetch-tomato-processor-facilities.ts
```

This command will run the script and generate the final dataset.

To make the pipeline easy to run, a command will be defined to execute the Python script:

```json
"scripts": {
  "fetch-data": "ts-node scripts/fetch-tomato-processor-facilities.ts"
}
```

This will allow developers to refresh the data by running a single command: `npm run fetch-data`.

## 5. Workflow Diagram

Here is a Mermaid diagram illustrating the proposed data pipeline workflow:

```mermaid
graph TD
    A[Developer runs 'npm run fetch-data'] --> B{scripts/fetch-tomato-processor-facilities.ts};
    B --> C[Authenticate with Google Sheets API using .env credentials];
    C --> D[Fetch data from Google Sheet "Sheet1" and "Sheet2"];
    D --> E[Merge attributes from "Sheet2" to locations in "Sheet1" using Pandas];
    E --> F[Generate final dataset];
    F --> G[Save data as src/data/sheet-data.json];
    G --> H[Next.js application imports and uses the JSON data];