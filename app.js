require('dotenv').config();
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var flash = require("connect-flash");
var moment = require("moment");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");
const mbxClient = require('@mapbox/mapbox-sdk');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geocodingClient = mbxGeocoding({ accessToken: process.env.MAPBOX_TOKEN });
var Campground = require("./models/campground");
var Comment = require("./models/comment");
var User = require("./models/user");
var seedDB = require("./seeds");

var commentRoutes = require("./routes/comments"),
	campgroundRoutes = require("./routes/campgrounds"),
	authRoutes = require("./routes/auth")

// seedDB();
mongoose.connect("mongodb://127.0.0.1/zelp_camp", {useNewUrlParser: true, useUnifiedTopology: true,});
app.use(bodyParser.urlencoded({extended: true}));
//leaving off the .ejs
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require('moment');

//Passport configuration
app.use(require("express-session")({
	secret: "secret",
	resave: false,
	saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

//Requring routes
app.use("/", authRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(3000, function(){
	console.log("Zelpcamp is working.");
});