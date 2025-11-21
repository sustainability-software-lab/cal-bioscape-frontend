# Data Pipeline Guide

## Overview

This guide explains how to set up and run the TypeScript script that fetches data from a Google Sheet and saves it as a JSON file. The script, located at `scripts/fetch-tomato-processor-facilities.ts`, connects to the Google Sheets API, retrieves data from a specified spreadsheet, and saves the processed data as a JSON file at `src/data/sheet-data.json`.

## Setup Instructions

### 1. Install Node.js

Download and install Node.js from the official [Node.js website](https://nodejs.org/en/download/).

### 2. Install Required Packages

Open a terminal or command prompt and run the following command to install the required Node.js packages:

```
npm install googleapis dotenv axios
```
## Setup Instructions

### 1. Set up a Google Cloud Service Account

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Navigate to **IAM & Admin > Service Accounts**.
3.  Click **Create Service Account**.
4.  Fill in the service account details and grant it the **Viewer** role.
5.  Click **Done**.

### 2. Enable the Google Sheets API

1.  Go to the [Google Cloud Console API Library](https://console.cloud.google.com/apis/library).
2.  Search for "Google Sheets API" and enable it for your project.

### 3. Generate and Download Credentials

1.  Go to the **Service Accounts** page in the Google Cloud Console.
2.  Click on the service account you created.
3.  Go to the **Keys** tab and click **Add Key > Create new key**.
4.  Select **JSON** as the key type and click **Create**.
5.  The JSON file will be downloaded to your computer.

### 4. Share the Google Sheet

1.  Open the Google Sheet you want to fetch data from.
2.  Click the **Share** button.
3.  Add the service account's email address (found in the JSON credentials file) and grant it **Viewer** access.

## Configuration

1.  Create a `.env` file at the project root.
2.  Add the following variable to the `.env` file, replacing the placeholder value with the contents of your service account credentials JSON file:

```
GOOGLE_APPLICATION_CREDENTIALS_JSON="YOUR_SERVICE_ACCOUNT_CREDENTIALS_JSON"
```

**Note:** Ensure the `GOOGLE_APPLICATION_CREDENTIALS_JSON` value is enclosed in double quotes.

## Running the Script

1.  Run the following command to fetch the data:

```
npx ts-node scripts/fetch-tomato-processor-facilities.ts
```

Alternatively, if you have configured the `fetch-data` script in your `package.json` file:

```
npm run fetch-data
```

2.  The script will create the `src/data/sheet-data.json` file with the processed data from the Google Sheet.