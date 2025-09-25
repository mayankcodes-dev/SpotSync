 if (process.env.NODE_ENV !== "production"){
     require('dotenv').config();
 }


const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session')
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const sanitizeV5 = require('./utils/mongoSanitizeV5.js');
const helmet = require('helmet');

const userRoutes = require('./routes/users');
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');

const MongoDBStore = require('connect-mongo')(session);

// Use MongoDB Atlas connection string from environment when provided,
// otherwise fall back to local MongoDB for development.
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const app = express();
app.engine('ejs', ejsMate);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('query parser', 'extended');

app.use(express.urlencoded({ extended: true }))  // parse data from form and give to req.body
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(sanitizeV5({ replaceWith: '_' }));

const store = new MongoDBStore({
    url: dbUrl,
    secret: process.env.SECRET,
    touchAfter: 24 * 60 * 60 // time period in seconds
});

store.on("error", function(e){
    console.log("SESSION STORE ERROR", e)
});

const sessionConfig = {
    store: store,
    name: 'session',
    // use a secret from environment in production
    secret: process.env.SECRET || 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    },
    }

app.use(session(sessionConfig));
app.use(flash());
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: [
                "'self'",
                "https://api.maptiler.com",
                "https://cdn.jsdelivr.net"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.maptiler.com",
                "https://cdn.jsdelivr.net",
                "https://kit.fontawesome.com/",
                "https://cdnjs.cloudflare.com/",
                "https://stackpath.bootstrapcdn.com/"
            ],
            styleSrc: [
                "'self'",
                "https://cdn.maptiler.com",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
                "https://kit-free.fontawesome.com/",
                "https://stackpath.bootstrapcdn.com",
                "https://use.fontawesome.com/"
            ],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com",
                "https://images.unsplash.com",
                "https://cdn.maptiler.com",
  "https://t3.ftcdn.net"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            objectSrc: [],
            workerSrc: ["'self'", "blob:"],
            frameSrc: []
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// how store and unstore user in session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.use('/',userRoutes);
app.use('/campgrounds',campgroundRoutes);
app.use('/campgrounds/:id/reviews',reviewRoutes);

app.get('/', (req, res) =>{
    res.render('home')
})

app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err,req,res,next)=>{
    const { statusCode = 500 } = err;
    if (!err.message) {
        err.message = 'Oh No, Something Went Wrong!';
    }
    res.status(statusCode).render('error', { err });
})
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})