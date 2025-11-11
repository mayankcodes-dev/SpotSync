const Campground = require('../models/campground.js');
const { cloudinary} = require('../cloudinary');
const { geocoding, config } = require('@maptiler/client');
const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;


module.exports.index =async (req, res) =>{
    const campgrounds = await Campground.find({});
    // Transform campgrounds to GeoJSON FeatureCollection
    const features = campgrounds.map(cg => ({
        type: 'Feature',
        geometry: cg.geometry,
        properties: {
            _id: cg._id,
            title: cg.title,
            location: cg.location,
            popUpMarkup: `<strong><a href='/campgrounds/${cg._id}'>${cg.title}</a></strong><p>${cg.description.substring(0, 20)}...</p>`
        }
    }));
    const campgroundsGeoJSON = {
        type: 'FeatureCollection',
        features
    };
    res.render('campgrounds/index', { campgrounds, campgroundsGeoJSON });
}

module.exports.renderNewForm = (req,res) =>{
     res.render('campgrounds/new');
}

module.exports.createCampground = async (req,res,next)=>{   
    const campground = new Campground(req.body.campground);

    // const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
    // campground.geometry = geoData.features[0].geometry;
    //perplexity 

    if (campground.location) {
        const geoData = await geocoding.forward(campground.location, { limit: 1 });
        if (geoData.features && geoData.features.length > 0) {
            campground.geometry = geoData.features[0].geometry;
        } else {
            req.flash('error', 'Location could not be found. Please try a different location.');
            return res.redirect(`/campgrounds/${id}/edit`);
        }
    }


    
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    
    //perplexity 
    // if (!campground.images.length) {
    //     campground.images.push({
    //         url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1470&q=80',
    //         filename: 'placeholder-campground-image'
    //     });
    // }


    campground.author = req.user._id;
    await campground.save();
    console.log(campground);
    req.flash('success', 'Successfully made a new campground!');
    res.redirect(`/campgrounds/${campground._id}`);

}

module.exports.showCampground = async (req, res) => {
    const campground = await Campground.findById(req.params.id)
    .populate({path:'reviews',populate:{path: 'author'} })
    .populate('author');
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    // Defensive: if the author or any review author was deleted, make a safe placeholder
    if (!campground.author) {
        campground.author = { username: 'Unknown', _id: null };
    }
    if (campground.reviews && campground.reviews.length) {
        for (let rev of campground.reviews) {
            if (!rev.author) {
                rev.author = { username: 'Unknown', _id: null };
            }
        }
    }
    res.render('campgrounds/show', { campground });
}

module.exports.renderEditForm = async (req,res) =>{
    const campground = await Campground.findById(req.params.id);
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req,res) =>{
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id);
    let geoData;
    try {
        geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
    } catch (err) {
        req.flash('error', 'Geocoding service error. Please try again later.');
        return res.redirect(`/campgrounds/${id}/edit`);
    }
    if (geoData && geoData.features && geoData.features.length > 0) {
        campground.geometry = geoData.features[0].geometry;
    } else {
        req.flash('error', 'Location could not be found. Please try a different location.');
        return res.redirect(`/campgrounds/${id}/edit`);
    }
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
    await campground.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
}
    //perplixity

//     if (!campground) {
//         req.flash('error', 'Cannot find that campground!');
//         return res.redirect('/campgrounds');
//     }

//     // Re-geocode if location changed
//     if (req.body.campground.location && req.body.campground.location !== campground.location) {
//         const geoData = await geocoding.forward(req.body.campground.location, { limit: 1 });
//         if (geoData.features && geoData.features.length > 0) {
//             req.body.campground.geometry = geoData.features[0].geometry;
//         } else {
//             req.flash('error', 'New location could not be found. Location not updated.');
//             delete req.body.campground.location;
//         }
//     }

//     const updatedCampground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });

//     const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
//     updatedCampground.images.push(...imgs);

//     if (req.body.deleteImages) {
//         for (let filename of req.body.deleteImages) {
//             if (filename !== 'placeholder-campground-image')
//                 await cloudinary.uploader.destroy(filename);
//         }
//         await updatedCampground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
//     }

//     await updatedCampground.save();


//     req.flash('success', 'Successfully updated campground!');
//     res.redirect(`/campgrounds/${campground._id}`);
// }

module.exports.deleteCampground = async (req,res) =>{
    const {id} = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted campground!');
    res.redirect('/campgrounds');
}
