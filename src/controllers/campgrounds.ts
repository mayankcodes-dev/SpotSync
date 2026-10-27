import { Request, Response, NextFunction } from 'express';
import Campground, { ICampground } from '../models/campground';
import { cloudinary } from '../cloudinary';
import { geocoding } from '@maptiler/client';
import * as maptilerClient from '@maptiler/client';
import { moderateImage } from '../services/geminiModeration';
import {
  getCached,
  setCache,
  deleteCache,
  CACHE_KEYS,
} from '../services/redis';

(maptilerClient as any).config.apiKey = process.env.MAPTILER_API_KEY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Delete a list of Cloudinary images safely (never throws). */
async function destroyImages(images: { filename: string }[]): Promise<void> {
  await Promise.allSettled(
    images.map((img) =>
      cloudinary.uploader
        .destroy(img.filename)
        .catch((err: Error) => console.error('Cloudinary delete error:', err)),
    ),
  );
}

/** Run Gemini moderation on all images; return the first unsafe reason or null. */
async function checkModeration(
  images: { url: string; filename: string }[],
): Promise<string | null> {
  if (images.length === 0) return null;

  const results = await Promise.allSettled(
    images.map((img) => moderateImage(img.url)),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && !result.value.isSafe) {
      return result.value.reason || 'Image failed content moderation.';
    }
    // If moderation threw (rejected promise) — fail open, allow upload
  }
  return null;
}

// ─── INDEX ───────────────────────────────────────────────────────────────────
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
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
          cg.geometry.coordinates.length >= 2,
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
            popUpMarkup: `<strong><a href="/spots/${cg._id}">${cg.title}</a></strong><p>${snippet}</p>`,
          },
        };
      });

    const campgroundsGeoJSON = { type: 'FeatureCollection', features };
    await setCache(CACHE_KEYS.campgroundsAll, { campgrounds, campgroundsGeoJSON });
    res.render('campgrounds/index', { campgrounds, campgroundsGeoJSON, activePage: 'campgrounds' });
  } catch (_err) {
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
export const createCampground = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const uploadedImages = files.map((f: any) => ({ url: f.path as string, filename: f.filename as string }));

    // ── Gemini AI Image Moderation ─────────────────────────────────────────
    const unsafeReason = await checkModeration(uploadedImages);
    if (unsafeReason) {
      // Clean up Cloudinary before redirecting
      await destroyImages(uploadedImages);
      req.flash(
        'error',
        `Image rejected: ${unsafeReason} Please upload a relevant camping or nature photo.`,
      );
      res.redirect('/spots/new');
      return;
    }

    // ── Geocoding ──────────────────────────────────────────────────────────
    const campground = new Campground(req.body.campground);
    if (campground.location) {
      try {
        const geoData = await geocoding.forward(campground.location, { limit: 1 });
        if (geoData.features && geoData.features.length > 0) {
          campground.geometry = geoData.features[0].geometry as any;
        } else {
          req.flash('error', 'Location could not be found. Please try a different location.');
          await destroyImages(uploadedImages);
          res.redirect('/spots/new');
          return;
        }
      } catch (_geoErr) {
        req.flash('error', 'Geocoding service error. Please try again later.');
        await destroyImages(uploadedImages);
        res.redirect('/spots/new');
        return;
      }
    }

    campground.images = uploadedImages;
    campground.author = (req.user as any)._id;
    await campground.save();

    await deleteCache(CACHE_KEYS.campgroundsAll);
    req.flash('success', 'Successfully created a new spot!');
    res.redirect(`/spots/${campground._id}`);
  } catch (err) {
    next(err);
  }
};

// ─── SHOW ─────────────────────────────────────────────────────────────────────
export const showCampground = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const cacheKey = CACHE_KEYS.campgroundById(id);

  const cached = await getCached<ICampground>(cacheKey);
  if (cached) {
    res.render('campgrounds/show', { campground: cached, activePage: 'campgrounds' });
    return;
  }

  const campground = await Campground.findById(id)
    .populate({ path: 'reviews', populate: { path: 'author' } })
    .populate('author');

  if (!campground) {
    req.flash('error', 'Cannot find that spot!');
    res.redirect('/spots');
    return;
  }

  await setCache(cacheKey, campground.toJSON());
  res.render('campgrounds/show', { campground, activePage: 'campgrounds' });
};

// ─── RENDER EDIT FORM ─────────────────────────────────────────────────────────
export const renderEditForm = async (req: Request, res: Response): Promise<void> => {
  const campground = await Campground.findById(req.params.id);
  if (!campground) {
    req.flash('error', 'Cannot find that spot!');
    res.redirect('/spots');
    return;
  }
  res.render('campgrounds/edit', { campground, activePage: 'campgrounds' });
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export const updateCampground = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);

    const files = (req.files as Express.Multer.File[]) || [];
    const newImages = files.map((f: any) => ({ url: f.path as string, filename: f.filename as string }));

    // ── Gemini AI Moderation BEFORE saving anything ────────────────────────
    // Bug fix: moderation must happen BEFORE findByIdAndUpdate, not after.
    const unsafeReason = await checkModeration(newImages);
    if (unsafeReason) {
      await destroyImages(newImages);
      req.flash(
        'error',
        `Image rejected: ${unsafeReason} Please upload a relevant camping or nature photo.`,
      );
      res.redirect(`/spots/${id}/edit`);
      return;
    }

    // ── Update text fields ─────────────────────────────────────────────────
    const campground = await Campground.findByIdAndUpdate(
      id,
      { ...req.body.campground },
      { new: true, runValidators: true },
    );

    if (!campground) {
      await destroyImages(newImages);
      req.flash('error', 'Cannot find that spot!');
      res.redirect('/spots');
      return;
    }

    // ── Geocode updated location ───────────────────────────────────────────
    try {
      const geoData = await geocoding.forward(req.body.campground.location, { limit: 1 });
      if (geoData?.features?.length > 0) {
        campground.geometry = geoData.features[0].geometry as any;
      } else {
        req.flash('error', 'Location could not be found. Please try a different location.');
        res.redirect(`/spots/${id}/edit`);
        return;
      }
    } catch (_geoErr) {
      req.flash('error', 'Geocoding service error. Please try again later.');
      res.redirect(`/spots/${id}/edit`);
      return;
    }

    // ── Append new images ──────────────────────────────────────────────────
    campground.images.push(...(newImages as any[]));

    // ── Delete removed images ──────────────────────────────────────────────
    if (req.body.deleteImages) {
      const toDelete: string[] = Array.isArray(req.body.deleteImages)
        ? req.body.deleteImages
        : [req.body.deleteImages];

      await destroyImages(toDelete.map((filename) => ({ filename })));
      await campground.updateOne({ $pull: { images: { filename: { $in: toDelete } } } });
    }

    await campground.save();

    // Invalidate cache
    await deleteCache(CACHE_KEYS.campgroundById(id));
    await deleteCache(CACHE_KEYS.campgroundsAll);

    req.flash('success', 'Successfully updated spot!');
    res.redirect(`/spots/${id}`);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE ──────────────────────────────────────────────────────────────────
export const deleteCampground = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  // Also delete images from Cloudinary
  const campground = await Campground.findById(id);
  if (campground?.images?.length) {
    await destroyImages(campground.images);
  }

  await Campground.findByIdAndDelete(id);
  await deleteCache(CACHE_KEYS.campgroundById(id));
  await deleteCache(CACHE_KEYS.campgroundsAll);

  req.flash('success', 'Successfully deleted spot!');
  res.redirect('/spots');
};
