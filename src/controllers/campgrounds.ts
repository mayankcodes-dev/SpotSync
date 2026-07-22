import { Request, Response, NextFunction } from 'express';
import Campground, { ICampground } from '../models/campground';
import { cloudinary } from '../cloudinary';
import { geocoding } from '@maptiler/client';
import * as maptilerClient from '@maptiler/client';
import { moderateImage } from '../services/groqModeration';
import {
  getCached,
  setCache,
  deleteCache,
  deleteCachePattern,
  CACHE_KEYS,
} from '../services/redis';

(maptilerClient as any).config.apiKey = process.env.MAPTILER_API_KEY;

// ─── INDEX ───────────────────────────────────────────────────────────────────
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    // Try Redis cache first
    const cached = await getCached<any>(CACHE_KEYS.campgroundsAll);
    if (cached) {
      const { campgrounds, campgroundsGeoJSON } = cached;
      res.render('campgrounds/index', { campgrounds, campgroundsGeoJSON, activePage: 'campgrounds' });
      return;
    }

    const campgrounds = await Campground.find({});

    const features = campgrounds
      .filter(
        (cg) =>
          cg.geometry &&
          Array.isArray(cg.geometry.coordinates) &&
          cg.geometry.coordinates.length >= 2
      )
      .map((cg) => {
        const desc = cg.description || '';
        const snippet = desc.length > 20 ? `${desc.substring(0, 20)}...` : desc;
        return {
          type: 'Feature',
          geometry: cg.geometry,
          properties: {
            _id: cg._id,
            title: cg.title,
            location: cg.location,
            popUpMarkup: `<strong><a href="/campgrounds/${cg._id}">${cg.title}</a></strong><p>${snippet}</p>`,
          },
        };
      });

    const campgroundsGeoJSON = { type: 'FeatureCollection', features };

    // Cache the result
    await setCache(CACHE_KEYS.campgroundsAll, { campgrounds, campgroundsGeoJSON });

    res.render('campgrounds/index', { campgrounds, campgroundsGeoJSON, activePage: 'campgrounds' });
  } catch (err) {
    res.render('campgrounds/index', {
      campgrounds: [],
      campgroundsGeoJSON: { type: 'FeatureCollection', features: [] },
      activePage: 'campgrounds',
    });
  }
};

// ─── RENDER NEW FORM ─────────────────────────────────────────────────────────
export const renderNewForm = (req: Request, res: Response): void => {
  res.render('campgrounds/new', { activePage: 'new' });
};

// ─── CREATE ──────────────────────────────────────────────────────────────────
export const createCampground = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  const uploadedImages = files.map((f: any) => ({ url: f.path, filename: f.filename }));

  // ── Groq AI Image Moderation ─────────────────────────────────────────────
  if (uploadedImages.length > 0) {
    const moderationResults = await Promise.all(
      uploadedImages.map(async (img) => {
        const result = await moderateImage(img.url);
        return { ...img, ...result };
      })
    );

    const unsafeImages = moderationResults.filter((r) => !r.isSafe);

    if (unsafeImages.length > 0) {
      // Delete ALL uploaded images from Cloudinary
      await Promise.all(
        uploadedImages.map((img) =>
          cloudinary.uploader.destroy(img.filename).catch((err) =>
            console.error('Cloudinary delete error:', err)
          )
        )
      );

      const reason = unsafeImages[0].reason || 'Image failed content moderation.';
      req.flash('error', `Image rejected: ${reason} Please upload a relevant campground/nature photo.`);
      res.redirect('/campgrounds/new');
      return;
    }
  }

  const campground = new Campground(req.body.campground);

  // Geocoding
  if (campground.location) {
    try {
      const geoData = await geocoding.forward(campground.location, { limit: 1 });
      if (geoData.features && geoData.features.length > 0) {
        campground.geometry = geoData.features[0].geometry as any;
      } else {
        req.flash('error', 'Location could not be found. Please try a different location.');
        await Promise.all(uploadedImages.map((img) => cloudinary.uploader.destroy(img.filename)));
        res.redirect('/campgrounds/new');
        return;
      }
    } catch (err) {
      req.flash('error', 'Geocoding service error. Please try again later.');
      await Promise.all(uploadedImages.map((img) => cloudinary.uploader.destroy(img.filename)));
      res.redirect('/campgrounds/new');
      return;
    }
  }

  campground.images = uploadedImages;
  campground.author = (req.user as any)._id;
  await campground.save();

  // Invalidate cache
  await deleteCache(CACHE_KEYS.campgroundsAll);

  req.flash('success', 'Successfully made a new campground!');
  res.redirect(`/campgrounds/${campground._id}`);
};

// ─── SHOW ─────────────────────────────────────────────────────────────────────
export const showCampground = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const cacheKey = CACHE_KEYS.campgroundById(id);

  // Try cache
  const cached = await getCached<ICampground>(cacheKey);
  if (cached) {
    res.render('campgrounds/show', { campground: cached, activePage: 'campgrounds' });
    return;
  }

  const campground = await Campground.findById(id)
    .populate({ path: 'reviews', populate: { path: 'author' } })
    .populate('author');

  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    res.redirect('/campgrounds');
    return;
  }

  // Cache the campground
  await setCache(cacheKey, campground.toJSON());

  res.render('campgrounds/show', { campground, activePage: 'campgrounds' });
};

// ─── RENDER EDIT FORM ─────────────────────────────────────────────────────────
export const renderEditForm = async (req: Request, res: Response): Promise<void> => {
  const campground = await Campground.findById(req.params.id);
  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    res.redirect('/campgrounds');
    return;
  }
  res.render('campgrounds/edit', { campground, activePage: 'campgrounds' });
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export const updateCampground = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground }, { new: true });

  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    res.redirect('/campgrounds');
    return;
  }

  // Geocode updated location
  try {
    const geoData = await geocoding.forward(req.body.campground.location, { limit: 1 });
    if (geoData && geoData.features && geoData.features.length > 0) {
      campground.geometry = geoData.features[0].geometry as any;
    } else {
      req.flash('error', 'Location could not be found. Please try a different location.');
      res.redirect(`/campgrounds/${id}/edit`);
      return;
    }
  } catch (err) {
    req.flash('error', 'Geocoding service error. Please try again later.');
    res.redirect(`/campgrounds/${id}/edit`);
    return;
  }

  const files = (req.files as Express.Multer.File[]) || [];
  const imgs = files.map((f: any) => ({ url: f.path, filename: f.filename }));
  campground.images.push(...(imgs as any[]));
  await campground.save();

  if (req.body.deleteImages) {
    for (const filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
  }

  // Invalidate cache
  await deleteCache(CACHE_KEYS.campgroundById(id));
  await deleteCache(CACHE_KEYS.campgroundsAll);

  req.flash('success', 'Successfully updated campground!');
  res.redirect(`/campgrounds/${id}`);
};

// ─── DELETE ──────────────────────────────────────────────────────────────────
export const deleteCampground = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  await Campground.findByIdAndDelete(id);

  // Invalidate cache
  await deleteCache(CACHE_KEYS.campgroundById(id));
  await deleteCache(CACHE_KEYS.campgroundsAll);

  req.flash('success', 'Successfully deleted campground!');
  res.redirect('/campgrounds');
};
