# YelpCamp

YelpCamp is a full-stack web application for sharing and reviewing campgrounds. Users can register, log in, create campgrounds, leave reviews, and view interactive maps. The project demonstrates authentication, CRUD operations, session management, and security best practices using modern JavaScript frameworks.

## Features

- User authentication (register, login, logout)
- Create, edit, and delete campgrounds
- Add and manage reviews for campgrounds
- Interactive maps integration
- Secure session management
- Input sanitation and security headers
- Flash messaging for notifications

## Tech Stack

- **Backend:** Node.js, Express.js, MongoDB (via Mongoose)
- **Authentication:** Passport.js (local strategy)
- **Templating:** EJS with ejs-mate
- **Sessions:** express-session with connect-mongo
- **Security:** helmet, input sanitation
- **Other:** dotenv for environment variables, method-override

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- MongoDB (local or Atlas)
- npm (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/coderMayank69/YELPCAMP.git
   cd YELPCAMP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory with the following:

   ```
   DB_URL=your_mongodb_connection_string
   SECRET=your_session_secret
   ```

   If you’re using MongoDB Atlas, use your Atlas connection string for `DB_URL`.

4. **Run the application**
   ```bash
   npm start
   ```

   The app will run on `http://localhost:3000` by default.

## Folder Structure

- `app.js` - Main server file
- `models/` - Mongoose models (User, Campground, Review)
- `routes/` - Express route definitions
- `views/` - EJS templates
- `public/` - Static assets (CSS, JS, images)
- `utils/` - Utility modules (error handling, sanitation)

## Security

- Sessions stored securely using connect-mongo
- Helmet sets content security policies and HTTP headers
- User input sanitized to protect against NoSQL injection and XSS

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---
