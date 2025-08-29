# Meal Planner API

This is the backend API for the meal planner application, built with Hono, Prisma, and Better Auth.

## Features

- **Authentication**: Better Auth integration with email/password and social providers
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket support for collaborative features
- **Type Safety**: Full TypeScript support

## Database Schema

The API includes the following models:

- **User**: User accounts and profiles
- **Household**: Collaborative household management
- **HouseholdMember**: Household membership and roles
- **InventoryItem**: Food inventory tracking
- **ShoppingListItem**: Collaborative shopping lists
- **Recipe**: Recipe management with ingredients
- **MealPlan**: Weekly meal planning
- **MealPlanItem**: Individual meal assignments

## Development

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:

   ```bash
   DATABASE_URL="your-database-url"
   BETTER_AUTH_SECRET="your-secret-key"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

3. Generate Prisma client:

   ```bash
   npm run db:generate
   ```

4. Push schema to database:

   ```bash
   npm run db:push
   ```

5. Seed development data:
   ```bash
   npm run db:seed
   ```

### Running

Start the development server:

```bash
npm run dev
```

The API will be available at:

- Health check: http://localhost:3000/api/health
- Auth endpoints: http://localhost:3000/api/auth/\*

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:seed` - Seed database with development data

## API Endpoints

### Authentication

- `POST /api/auth/sign-up` - Create new account
- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

### Health Check

- `GET /api/health` - API health status

More endpoints will be added in subsequent tasks.
