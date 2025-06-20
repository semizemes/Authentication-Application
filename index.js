import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
env.config(); // Load environment variables from a .env file

// Configure session middleware
app.use(
    session({
      secret: process.env.SESSION_SECRET, // Secret key for signing the session ID
      resave: false, // Prevents resaving session if it hasn't been modified
      saveUninitialized: true, // Saves uninitialized sessions
    })
);
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static("public")); // Serve static files from the "public" directory

// Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// Configure PostgreSQL client
const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
db.connect(); // Connect to the database

/**
 * Route: Home page
 * Renders the home page.
 */
app.get("/", (req, res) => {
  res.render("home.ejs");
});

/**
 * Route: Login page
 * Renders the login page.
 */
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

/**
 * Route: Registration page
 * Renders the registration page.
 */
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

/**
 * Route: Logout
 * Logs out the user and redirects to the home page.
 */
app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

/**
 * Route: Secrets page
 * Displays the user's secret if authenticated.
 */
app.get("/secrets", async (req, res) => {
  const userEmail = req.user.email; // Get the authenticated user's email
  const userSecret = await db.query('select secret from users where email=$1;', [userEmail]); // Query the user's secret
  let isSecret = userSecret.rows[0].secret; // Extract the secret from the query result
  console.log('The secret comes from SQL:', isSecret);
  if (req.isAuthenticated()) {
    res.render("secrets.ejs", {
      secret: isSecret, // Pass the secret to the template
    });
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
});

/**
 * Route: Submit page
 * Renders the submit page if the user is authenticated.
 */
app.get('/submit', async (req, res) => {
  if (req.isAuthenticated()) {
    res.render('submit.ejs');
  } else {
    res.redirect("/login");
  }
});

/**
 * Route: Google authentication
 * Initiates Google OAuth2 authentication.
 */
app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"], // Request profile and email scopes
    })
);

/**
 * Route: Google authentication callback
 * Handles the callback after Google authentication.
 */
app.get(
    "/auth/google/secrets",
    passport.authenticate("google", {
      successRedirect: "/secrets", // Redirect to secrets on success
      failureRedirect: "/login", // Redirect to login on failure
    })
);

/**
 * Route: Login form submission
 * Authenticates the user using the local strategy.
 */
app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/secrets", // Redirect to secrets on success
      failureRedirect: "/login", // Redirect to login on failure
    })
);

/**
 * Route: Registration form submission
 * Registers a new user and logs them in.
 */
app.post("/register", async (req, res) => {
  const email = req.body.username; // Extract email from the form
  const password = req.body.password; // Extract password from the form

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1;", [
      email,
    ]); // Check if the user already exists

    if (checkResult.rows.length > 0) {
      req.redirect("/login"); // Redirect to login if user exists
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
              "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *;",
              [email, hash]
          ); // Insert the new user into the database
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/secrets"); // Redirect to secrets after successful registration
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

/**
 * Route: Submit form submission
 * Updates the user's secret in the database.
 */
app.post('/submit', async (req, res) => {
  let userEmail = req.user.email; // Get the authenticated user's email
  let userSecret = req.body.secret; // Get the submitted secret
  try {
    await db.query('UPDATE users SET secret = $1 WHERE email = $2;', [userSecret, userEmail]); // Update the user's secret in the database
    res.redirect('/secrets'); // Redirect to secrets after updating
  } catch (e) {
    console.log(e);
  }
});

/**
 * Passport strategy: Local authentication
 * Verifies the user's credentials using the local strategy.
 */
passport.use(
    "local",
    new Strategy(async function verify(username, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1;", [
          username,
        ]); // Query the user by email
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                return cb(null, user); // Authentication successful
              } else {
                return cb(null, false); // Invalid password
              }
            }
          });
        } else {
          return cb("User not found");
        }
      } catch (err) {
        console.log(err);
      }
    })
);

/**
 * Passport strategy: Google authentication
 * Verifies the user's credentials using Google OAuth2.
 */
passport.use(
    "google",
    new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID, // Google client ID
          clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Google client secret
          callbackURL: "http://localhost:3000/auth/google/secrets", // Callback URL
          userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", // User profile URL
        },
        async (accessToken, refreshToken, profile, cb) => {
          try {
            const result = await db.query("SELECT * FROM users WHERE email = $1;", [
              profile.email,
            ]); // Query the user by email
            if (result.rows.length === 0) {
              const newUser = await db.query(
                  "INSERT INTO users (email, password) VALUES ($1, $2);",
                  [profile.email, "google"]
              ); // Insert a new user if not found
              return cb(null, newUser.rows[0]);
            } else {
              return cb(null, result.rows[0]); // Return the existing user
            }
          } catch (err) {
            return cb(err);
          }
        }
    )
);

/**
 * Serialize user into the session.
 */
passport.serializeUser((user, cb) => {
  cb(null, user);
});

/**
 * Deserialize user from the session.
 */
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

/**
 * Start the server.
 * Listens on the specified port.
 */
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});