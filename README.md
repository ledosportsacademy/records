# LEDO Sports Academy Management System

A web-based management system for LEDO Sports Academy to track members, payments, expenses, and donations.

## Features

- Member management with payment tracking
- Expense tracking
- Donation management
- Financial reporting
- Admin controls
- MongoDB database integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. The MongoDB connection string is already configured in `server.js`. If you need to change it, update the `MONGODB_URI` variable.

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Admin Access

Default admin password: `887620`

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Additional: Font Awesome, Google Fonts

## API Endpoints

- `/api/members` - GET, POST, PUT, DELETE
- `/api/expenses` - GET, POST, DELETE
- `/api/donations` - GET, POST, DELETE 