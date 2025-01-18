#  Project Setup Guide

This guide will help you set up a new  project with environment variables.

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Project Setup Steps

1. Clone this git:

2. Install dependencies:
```bash
npm install
```

3. Create Environment Files:
Create a `.env` file in the root directory of your project:
```bash
touch .env
```

4. Add Environment Variable:
Open `.env` and add:
```plaintext
VITE_API_URL=your_api_url_here
```



## Running the Project

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173` by default.
