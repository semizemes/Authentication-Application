# User Guide - Authentication Application

## Setup Instructions

1. **Install Dependencies**
```bash
npm install
```

2. **Set Up Environment Variables** Create a file in the project root with: `.env`
   SESSION_SECRET=your_secret_key
   PG_USER=your_postgres_username
   PG_HOST=localhost
   PG_DATABASE=your_database_name
   PG_PASSWORD=your_postgres_password
   PG_PORT=5432
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

3. **Set Up Database**
- Create a PostgreSQL database
- Create a users table:

CREATE TABLE users (
email VARCHAR(255) PRIMARY KEY,
password VARCHAR(255),
secret TEXT
);


4. **Start the Application**
   node index.js

The server will start at [http://localhost:3000](http://localhost:3000)


## How to Use
### 1. Register a New Account
- Visit [http://localhost:3000/register](http://localhost:3000/register)
- Options:
    - Fill out the registration form with email and password
    - Or click "Sign in with Google" to use Google account

### 2. Login
- Visit [http://localhost:3000/login](http://localhost:3000/login)
- Options:
    - Use email/password
    - Click "Sign in with Google"

### 3. Managing Secrets
After logging in:
1. View your secret:
    - Go to the Secrets page
    - Your current secret will be displayed if you have one

2. Submit a new secret:
    - Click "Submit a Secret"
    - Enter your secret
    - Click Submit

### 4. Logout
- Click the logout button or visit [http://localhost:3000/logout](http://localhost:3000/logout)

## Features You Can Use
1. **Local Authentication**
    - Register with email/password
    - Login with registered credentials
    - Securely stored passwords

2. **Google Authentication**
    - One-click sign in with Google account
    - Automatic account creation on first login

3. **Secret Management**
    - Store personal secrets
    - View your stored secret
    - Update your secret anytime

4. **Session Management**
    - Persistent login sessions
    - Secure session handling
    - Automatic session cleanup

## Security Features
- Passwords are securely hashed
- Protected routes require authentication
- Secure session management
- CSRF protection
- SQL injection protection

## Troubleshooting
1. **Can't Login**
    - Check if email/password are correct
    - Ensure database is running
    - Verify environment variables are set

2. **Google Login Issues**
    - Ensure Google credentials are correct in .env
    - Check if callback URL matches Google Console settings
    - Verify internet connection

3. **Database Connection Issues**
    - Verify PostgreSQL is running
    - Check database credentials in .env
    - Ensure database and table exist
