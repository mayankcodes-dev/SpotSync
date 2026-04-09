# YelpCamp

YelpCamp is a full-stack web application for sharing and reviewing campgrounds. Users can register, log in, create campgrounds, leave reviews, and view interactive maps. The project demonstrates authentication, authorization, CRUD operations, and real-time map integration.

## Features

- **User Authentication**: Register, login, logout with Passport.js local strategy
- **Campground Management**: Create, read, update, and delete campgrounds with image uploads
- **Reviews System**: Add and manage reviews with ratings for campgrounds
- **Interactive Maps**: MapTiler integration for displaying campground locations
- **Image Management**: Cloudinary integration for secure image storage and management
- **Session Management**: Secure session management with MongoDB store
- **Authorization**: Role-based access control (author-only edit/delete)
- **Input Validation**: Server-side validation with Joi schemas
- **Security**: Helmet for security headers, input sanitization, CORS protection

## Tech Stack

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database
- **Mongoose**: ODM for MongoDB

### Authentication & Security
- **Passport.js**: Authentication middleware with local strategy
- **passport-local-mongoose**: Mongoose authentication plugin
- **Helmet**: Security headers middleware
- **express-mongo-sanitize**: NoSQL injection prevention

### Storage & Media
- **Cloudinary**: Cloud image storage and transformation
- **multer**: File upload middleware
- **multer-storage-cloudinary**: Cloudinary storage for multer

### Frontend & Templating
- **EJS**: Embedded JavaScript templating
- **ejs-mate**: EJS layout/template engine
- **Bootstrap**: CSS framework (in views)

### Maps & Geolocation
- **@maptiler/sdk**: Interactive maps library
- **@maptiler/client**: MapTiler client library

### Session & Flash Messages
- **express-session**: Session middleware
- **connect-mongo**: MongoDB session store
- **connect-flash**: Flash message middleware

### Validation
- **Joi**: Data validation library

### Other
- **dotenv**: Environment variable management
- **method-override**: HTTP method override middleware

## Installation

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or MongoDB Atlas)
- npm or yarn
- Cloudinary account (for image uploads)
- MapTiler account (for maps)

### Setup Instructions

1. **Clone the repository**
   bash
   git clone https://github.com/coderMayank69/YELPCAMP.git
   cd YELPCAMP
   

2. **Install dependencies**
   bash
   npm install
   

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   
   NODE_ENV=development
   PORT=3000
   
   DB_URL=mongodb://localhost:27017/yelp-camp
   
   SECRET=your_session_secret_key
   
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   MAPTILER_API_KEY=your_maptiler_api_key
   

4. **Start the application**
   bash
   npm start
   
   For development with auto-reload:
   bash
   npm run dev
   
   The application will run on http://localhost:3000

## Project Structure

YELPCAMP/
├── app.js                  # Main application entry point
├── middleware.js           # Custom middleware functions
├── schemas.js              # Joi validation schemas
├── controllers/            # Route controllers
│   ├── users.js           # User authentication controllers
│   ├── campgrounds.js     # Campground CRUD controllers
│   └── reviews.js         # Review controllers
├── routes/                # Express routes
│   ├── users.js           # User routes (register, login, logout)
│   ├── campgrounds.js     # Campground routes
│   └── reviews.js         # Review routes
├── models/                # Mongoose schemas
│   ├── user.js            # User model
│   ├── campground.js      # Campground model with geospatial support
│   └── review.js          # Review model
├── cloudinary/            # Cloudinary configuration
├── utils/                 # Utility functions
│   ├── catchAsync.js      # Async error handling wrapper
│   ├── ExpressError.js    # Custom error class
│   └── mongoSanitizeV5.js # MongoDB sanitization
├── views/                 # EJS templates
├── public/                # Static assets (CSS, JS, images)
├── seeds/                 # Database seeding scripts
├── package.json
└── README.md

## API Endpoints

### Authentication Routes (Base: "/")

#### User Registration
- **GET** "/register" - Render registration form
- **POST** "/register" - Register a new user
  - Body: { username, email, password }
  - Returns: Redirects to "/campgrounds" on success

#### User Login
- **GET** "/login" - Render login form
- **POST** "/login" - Authenticate user
  - Body: { username, password }
  - Returns: Redirects to original URL or "/campgrounds"

#### User Logout
- **GET** "/logout" - Logout current user
  - Returns: Redirects to "/campgrounds"

### Campground Routes (Base: "/campgrounds")

#### Get All Campgrounds
- **GET** "/campgrounds" - Retrieve all campgrounds
  - Returns: List of campgrounds with pagination
  - Query params: page, limit

#### Create New Campground
- **GET** "/campgrounds/new" - Render new campground form (requires login)
- **POST** "/campgrounds" - Create a new campground (requires login)
  - Body: { title, description, price, location, image[] }
  - File uploads: Multiple images via multer/Cloudinary
  - Returns: Redirects to new campground show page

#### Get Campground by ID
- **GET** "/campgrounds/:id" - Get specific campground details
  - Returns: Campground data with reviews and map

#### Update Campground
- **GET** "/campgrounds/:id/edit" - Render edit form (author only)
- **PUT** "/campgrounds/:id" - Update campground (author only)
  - Body: { title, description, price, location, image[] }
  - Returns: Redirects to updated campground page

#### Delete Campground
- **DELETE** "/campgrounds/:id" - Delete campground (author only)
  - Returns: Redirects to "/campgrounds"

### Review Routes (Base: "/campgrounds/:id/reviews")

#### Create Review
- **POST** "/campgrounds/:id/reviews" - Add review to campground (requires login)
  - Body: { body, rating }
  - Returns: Redirects to campground page

#### Delete Review
- **DELETE** "/campgrounds/:id/reviews/:reviewID" - Delete review (review author only)
  - Returns: Redirects to campground page

## Database Models

### User Model
User {
  username: String (unique),
  email: String (required, unique),
  password: String (hashed via passport-local-mongoose)
}

### Campground Model
Campground {
  title: String,
  description: String,
  price: Number,
  location: String,
  geometry: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  images: [
    {
      url: String,
      filename: String,
      thumbnail: String (virtual)
    }
  ],
  author: ObjectId (ref: User),
  reviews: [ObjectId] (ref: Review),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

### Review Model
Review {
  body: String,
  rating: Number,
  author: ObjectId (ref: User),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

## Security Features

1. **Authentication**: Passport.js with local strategy
2. **Session Security**: Sessions stored in MongoDB, httpOnly cookies
3. **Input Validation**: Joi schemas for campground and review validation
4. **Data Sanitization**: express-mongo-sanitize prevents NoSQL injection
5. **Security Headers**: Helmet.js sets CSP and other HTTP headers
6. **Authorization Middleware**: isLoggedIn, isAuthor, isReviewAuthor checks
7. **Error Handling**: Custom ExpressError class with proper HTTP status codes
8. **CORS Configuration**: Controlled cross-origin requests

## Middleware

- **isLoggedIn**: Ensures user is authenticated
- **isAuthor**: Verifies user is the campground author
- **isReviewAuthor**: Verifies user is the review author
- **validateCampground**: Validates campground data with Joi schema
- **validateReview**: Validates review data with Joi schema
- **storeReturnTo**: Stores original URL for post-login redirect

## Error Handling

The application uses a centralized error handling approach:
- **catchAsync**: Wrapper for async route handlers to catch Promise rejections
- **ExpressError**: Custom error class with statusCode and message
- **Global error handler**: Express middleware catches and formats all errors

## Getting Started Examples

### Register a New User
1. Navigate to http://localhost:3000/register
2. Enter username, email, and password
3. Click "Register" to create account

### Create a Campground
1. Log in to your account
2. Click "Add Campground" or navigate to /campgrounds/new
3. Fill in campground details (title, description, price, location)
4. Upload campground images
5. Click "Create Campground" to submit

### Leave a Review
1. Navigate to a campground
2. Scroll to reviews section
3. Enter review text and rating (1-5)
4. Click "Submit Review"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the ISC License.

## Author

Created by coderMayank69

## Acknowledgments

- Express.js documentation
- Mongoose guides
- Passport.js authentication
- Cloudinary API
- MapTiler maps

## Deployment

-https://yelpcamp-1-wcof.onrender.com/
