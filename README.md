# YelpCamp 🏕️

> A full-stack campground listing and review platform — discover, share, and review campgrounds around the world.

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-v5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)
![Live](https://img.shields.io/badge/Live-Render-46E3B7?logo=render&logoColor=white)

**Live Demo →** [https://yelpcamp-1-wcof.onrender.com](https://yelpcamp-1-wcof.onrender.com)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Database Models](#database-models)
- [Security](#security)
- [Docker](#docker)
- [Author](#author)

---

## Overview

YelpCamp is a full-stack web application inspired by Yelp, built specifically for campgrounds. Users can browse campgrounds on an interactive map, create their own listings with photo uploads, and leave star-rated reviews. The project demonstrates real-world patterns including authentication, authorization, cloud storage, geolocation, and secure session management.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Register, login, logout via Passport.js local strategy |
| 🏕️ Campground CRUD | Create, view, edit, and delete campground listings |
| 🖼️ Image Uploads | Multi-image upload via Multer + Cloudinary |
| ⭐ Reviews & Ratings | Star-rated reviews with author-only delete |
| 🗺️ Interactive Maps | MapTiler SDK for geolocation and map display |
| 🔒 Authorization | Author-only edit/delete for campgrounds and reviews |
| 🛡️ Security | Helmet CSP headers, NoSQL injection prevention, input sanitization |
| 📦 Session Store | Persistent sessions stored in MongoDB via connect-mongo |
| ✅ Validation | Server-side validation using Joi schemas |
| 📱 Responsive UI | Mobile-friendly Bootstrap 5 layout |

---

## 🛠️ Tech Stack

### Backend
- **Node.js** (v18+) — JavaScript runtime
- **Express.js** (v5) — Web framework
- **MongoDB** + **Mongoose** (v8) — Database & ODM

### Authentication & Security
- **Passport.js** — Authentication middleware (local strategy)
- **passport-local-mongoose** — Mongoose plugin for auth
- **Helmet** (v8) — HTTP security headers & CSP
- **express-mongo-sanitize** — NoSQL injection prevention
- **sanitize-html** — HTML input sanitization

### Storage & Media
- **Cloudinary** — Cloud image storage
- **Multer** + **multer-storage-cloudinary** — File upload handling

### Frontend & Templating
- **EJS** + **ejs-mate** — Server-side templating with layouts
- **Bootstrap 5** — Responsive UI components
- **Font Awesome** — Icons

### Maps & Geolocation
- **@maptiler/sdk** — Interactive map rendering
- **@maptiler/client** — Geocoding API client

### Session & Messaging
- **express-session** — Session middleware
- **connect-mongo** — MongoDB-backed session store
- **connect-flash** — Flash messages

### Utilities
- **dotenv** — Environment variable management
- **method-override** — RESTful HTTP method support (PUT/DELETE via forms)
- **Joi** — Schema validation

---

## 📁 Project Structure

```
YELPCAMP/
├── app.js                    # Entry point — Express setup, middleware, routes
├── middleware.js             # isLoggedIn, isAuthor, validateCampground, etc.
├── schemas.js                # Joi validation schemas
├── Dockerfile                # Docker container configuration
├── controllers/
│   ├── campgrounds.js        # Campground CRUD logic
│   ├── reviews.js            # Review create/delete logic
│   └── users.js              # Register, login, logout logic
├── routes/
│   ├── campgrounds.js        # /campgrounds routes
│   ├── reviews.js            # /campgrounds/:id/reviews routes
│   └── users.js              # /register, /login, /logout routes
├── models/
│   ├── campground.js         # Campground schema (with geospatial support)
│   ├── review.js             # Review schema
│   └── user.js               # User schema (passport-local-mongoose)
├── cloudinary/
│   └── index.js              # Cloudinary + multer storage config
├── utils/
│   ├── catchAsync.js         # Async error handler wrapper
│   ├── ExpressError.js       # Custom error class
│   └── mongoSanitizeV5.js   # Custom sanitization middleware
├── views/
│   ├── layouts/
│   │   └── boilerplate.ejs   # Base layout template
│   ├── partials/
│   │   ├── navbar.ejs
│   │   └── footer.ejs
│   ├── campgrounds/          # Campground views (index, show, new, edit)
│   ├── users/                # Login & register views
│   ├── home.ejs
│   └── error.ejs
├── public/
│   ├── stylesheets/          # Custom CSS
│   └── javascripts/          # Client-side JS (map scripts, etc.)
├── seeds/                    # Database seeding scripts
├── package.json
└── .env                      # Environment variables (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js **v18+**
- MongoDB (local) or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- [Cloudinary](https://cloudinary.com/) account
- [MapTiler](https://www.maptiler.com/) account

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

3. **Set up environment variables** (see [Environment Variables](#environment-variables))

4. **Run in development mode**
   ```bash
   npm run dev
   ```

5. **Or run in production mode**
   ```bash
   npm start
   ```

The app will be available at **http://localhost:3000**

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# App
NODE_ENV=development
PORT=3000

# Database
DB_URL=mongodb://localhost:27017/yelp-camp

# Session
SECRET=your_strong_session_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# MapTiler
MAPTILER_API_KEY=your_maptiler_api_key
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 🔌 API Routes

### Authentication

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| GET | `/register` | Registration form | No |
| POST | `/register` | Create new user | No |
| GET | `/login` | Login form | No |
| POST | `/login` | Authenticate user | No |
| GET | `/logout` | Logout current user | Yes |

### Campgrounds

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| GET | `/campgrounds` | All campgrounds | No |
| GET | `/campgrounds/new` | New campground form | Yes |
| POST | `/campgrounds` | Create campground | Yes |
| GET | `/campgrounds/:id` | Campground details | No |
| GET | `/campgrounds/:id/edit` | Edit form | Yes (author only) |
| PUT | `/campgrounds/:id` | Update campground | Yes (author only) |
| DELETE | `/campgrounds/:id` | Delete campground | Yes (author only) |

### Reviews

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| POST | `/campgrounds/:id/reviews` | Add a review | Yes |
| DELETE | `/campgrounds/:id/reviews/:reviewId` | Delete a review | Yes (author only) |

---

## 🗃️ Database Models

### User
```js
{
  username: String,       // unique
  email:    String,       // required, unique
  // password handled by passport-local-mongoose (hashed + salted)
}
```

### Campground
```js
{
  title:       String,
  description: String,
  price:       Number,
  location:    String,
  geometry: {
    type:        'Point',
    coordinates: [Number]  // [longitude, latitude]
  },
  images: [{
    url:      String,
    filename: String
    // thumbnail: virtual field
  }],
  author:    ObjectId,   // ref: User
  reviews:   [ObjectId], // ref: Review
  timestamps: true
}
```

### Review
```js
{
  body:      String,
  rating:    Number,     // 1–5
  author:    ObjectId,   // ref: User
  timestamps: true
}
```

---

## 🔒 Security

- **Helmet.js** — Strict Content Security Policy (CSP) for scripts, styles, images, fonts
- **express-mongo-sanitize** — Prevents NoSQL injection via query string manipulation
- **sanitize-html** — Strips unsafe HTML from user input
- **Passport.js** — Secure local authentication with hashed passwords
- **httpOnly cookies** — Session cookies not accessible via JavaScript
- **MongoDB session store** — Sessions persisted securely, not in memory
- **Authorization middleware** — `isAuthor` / `isReviewAuthor` guards prevent unauthorized mutations

---

## 🐳 Docker

A `Dockerfile` is included for containerized deployment:

```bash
# Build the image
docker build -t yelpcamp .

# Run the container
docker run -p 3000:3000 --env-file .env yelpcamp
```

---

## 👨‍💻 Author

**Mayank Singh**
- Portfolio: [mayank-developer.vercel.app](https://mayank-developer.vercel.app/)
- GitHub: [@coderMayank69](https://github.com/coderMayank69)

---

## 📄 License

This project is open source and available under the [ISC License](https://opensource.org/licenses/ISC).
