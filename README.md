
# BFast Shipment Management System

A full-stack web application for managing orders and shipments across multiple Shopify stores, built with React, Express, and PostgreSQL.

## Features

- User authentication with role-based access control
- Order management and tracking
- Client/store management 
- Real-time shipping status updates
- Shopify and Shiprocket integration
- Responsive dashboard interface

## Tech Stack

- Frontend: React, TypeScript, TailwindCSS, Shadcn UI
- Backend: Express.js, Node.js
- Database: PostgreSQL with Drizzle ORM
- Authentication: JWT

## Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn
- PostgreSQL database

## Environment Variables

The following environment variables need to be set in the Secrets tab:

```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
```

## Getting Started

1. Fork this template on Replit

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables in the Secrets tab

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at port 5000.

## Project Structure

```
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # Utilities and API functions
│   │   └── pages/        # Page components
├── server/               # Backend Express application
│   ├── services/         # Business logic
│   └── routes/          # API routes
└── shared/              # Shared types and schemas
```

## API Documentation

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout

### Orders
- GET `/api/orders` - Get all orders
- PUT `/api/orders/:id` - Update order status

### Clients
- GET `/api/clients` - Get all clients
- POST `/api/clients` - Create new client

## User Roles

- BFAST_ADMIN: Full system access
- BFAST_EXECUTIVE: Order management
- CLIENT_ADMIN: Client-specific management
- CLIENT_EXECUTIVE: Client-specific order view

## Deployment

To deploy your application:

1. Click the "Deploy" button in the Replit interface
2. Select "Autoscale" deployment type
3. Configure the deployment settings:
   - Build command: `npm run build`
   - Run command: `npm start`
4. Click "Deploy" to publish your application

## License

MIT License
