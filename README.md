# Online Course & Workshop Registration Portal - Backend

A full-stack application for managing online course and workshop registrations with a beautiful frontend and Node.js backend.

## Features

### Frontend
- Beautiful glassmorphic UI with animated backgrounds
- Course and workshop browsing with search and filtering
- Registration form with validation
- Local storage (IndexedDB) for offline functionality
- Admin panel to view registrations
- Export registrations as CSV

### Backend
- RESTful API with Express.js
- SQLite database for persistent storage
- JWT-based authentication for admin access
- Registration management endpoints
- CSV export functionality
- Statistics endpoint

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Default Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Important:** Change the default password in production by updating the `JWT_SECRET` environment variable and creating a new admin user.

## API Endpoints

### Public Endpoints

- `POST /api/register` - Submit a new registration
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "program": "Full Stack Web Development",
    "type": "course",
    "notes": "Interested in AI features",
    "time": "2024-01-01 10:00:00"
  }
  ```

- `POST /api/login` - Admin login
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
  Returns: `{ "message": "Login successful", "token": "...", "user": {...} }`

### Protected Endpoints (Require JWT Token)

All protected endpoints require an `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

- `GET /api/registrations` - Get all registrations (admin only)
- `GET /api/registrations/:id` - Get single registration (admin only)
- `DELETE /api/registrations/:id` - Delete a registration (admin only)
- `DELETE /api/registrations` - Clear all registrations (admin only)
- `GET /api/registrations/export/csv` - Export registrations as CSV (admin only)
- `GET /api/stats` - Get registration statistics (admin only)

## Usage

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000`

3. **Browse courses and workshops:**
   Use the search and filter controls to find programs

4. **Register for a program:**
   Click "Register" on any course or workshop card, fill in the form, and submit

5. **Admin access:**
   - Click "Login" button (bottom right)
   - Enter admin credentials
   - View and manage registrations through the admin panel
   - Export data as CSV

## Database

The application uses SQLite database (`portal.db`) that is automatically created on first run. The database contains:

- **registrations** table - Stores all registration submissions
- **users** table - Stores admin user accounts

## Environment Variables

You can set the following environment variables:

- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens (default: 'your-secret-key-change-in-production')

Example:
```bash
PORT=8080 JWT_SECRET=my-secret-key npm start
```

## Project Structure

```
.
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── online portal.html     # Frontend application
├── portal.db              # SQLite database (created automatically)
└── README.md             # This file
```

## Security Notes

1. Change the default admin password in production
2. Set a strong `JWT_SECRET` environment variable
3. Use HTTPS in production
4. Consider rate limiting for production deployment
5. Implement proper CORS policies for production

## Troubleshooting

- **Port already in use:** Change the PORT environment variable
- **Database errors:** Delete `portal.db` to reset the database
- **Login not working:** Ensure the server is running and check browser console for errors

## License

ISC
