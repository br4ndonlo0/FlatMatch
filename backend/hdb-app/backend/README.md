# Backend Project Documentation

## Overview

This backend project is built using Node.js and Express, providing a RESTful API for user authentication and registration. It connects to a database to store user information securely.

## Project Structure

The backend project is organized as follows:

```
backend
├── src
│   ├── app.ts                # Entry point of the application
│   ├── controllers           # Contains controller logic for handling requests
│   │   └── authController.ts # Handles user authentication and registration
│   ├── routes                # Defines API routes
│   │   └── authRoutes.ts     # Routes for authentication
│   ├── models                # Contains data models
│   │   └── userModel.ts      # User schema and database interaction methods
│   └── utils                 # Utility functions
│       └── db.ts            # Database connection logic
├── package.json              # NPM dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation for the backend project
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- TypeScript
- A database (e.g., MongoDB, PostgreSQL)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd hdb-app/backend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

### Running the Application

To start the backend server, run the following command:
```
npm start
```

The server will run on `http://localhost:3000` by default.

### API Endpoints

- **POST /api/register**: Register a new user.
- **POST /api/login**: Authenticate a user.

### Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.