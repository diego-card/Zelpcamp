var express = require("express");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geocodingClient = mbxGeocoding({ accessToken: process.env.MAPBOX_TOKEN });
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed.'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dusu4oddq', 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});


//INDEX - show all campgrounds
router.get("/", function(req, res){
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get all campgrounds from DB
        Campground.find({name: regex}, function(err, searchResults){
           if(err){
               console.log(err);
           } else {
              if(searchResults.length === 0) {
                    req.flash("error", "Campground not found. Please try again");
                	return res.redirect("/campgrounds");
        	 }
              res.render("campgrounds/index",{campgrounds:searchResults, page: "campgrounds"});
           }
        });
    	} else {
        // Get all campgrounds from DB
        Campground.find({}, function(err, allCampgrounds){
           if(err){
        		console.log(err);
          	} else {
        		res.render("campgrounds/index",{campgrounds:allCampgrounds });
        	}
    	});
    }
});

//CREATE	
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
	if (err) {
		req.flash("error", "Can't upload image, try again later.");
		return req.redirect("back");
}
  	// add cloudinary url for the image to the campground object under image property
	  req.body.campground.image = result.secure_url;
	// add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
	// add author to campground
	  req.body.campground.author = {
		id: req.user._id,
		username: req.user.username
	  }
	  Campground.create(req.body.campground, function(err, campground) {
		if (err) {
		  req.flash('error', err.message);
		  return res.redirect('back');
		}
		res.redirect('/campgrounds/' + campground.id);
	  });
	});
});

router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new")
});

//SHOW ROUTE
router.get("/:id", function(req, res){
	//find the campground with provided id
	Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found.")
			res.redirect("back");
		} else {
			//render show template with that camprground
			res.render("campgrounds/show", {campground: foundCampground})
		}
	});
});

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		res.render("campgrounds/edit", {campground: foundCampground});
	});
});

//UPDATE CAMPGROUND ROUTE
router.put("/:id", upload.single('image'), function(req, res){
    Campground.findById(req.params.id, async function(err, foundCampground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(foundCampground.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  foundCampground.imageId = result.public_id;
                  foundCampground.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            foundCampground.name = req.body.name;
			foundCampground.price = req.body.price;
            foundCampground.description = req.body.description;
            foundCampground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + foundCampground._id);
        }
    });
});


//DESTROY
router.delete('/:id', middleware.checkCampgroundOwnership, function(req, res) {
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
      // Comment.deleteMany( {_id: { $in: campground.comments } }, function (err) {
      //       if (err) {
      //           console.log(err);
			// }
      //       return res.redirect('/campgrounds');
    	// });

        await cloudinary.v2.uploader.destroy(campground.imageId);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        return res.redirect('/campgrounds');
		
		
		
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;