import { cloudinary } from '../cloudinary';

export interface CloudinaryImageReference {
  filename: string;
}

/** Delete Cloudinary assets without allowing cleanup failures to break a request. */
export async function destroyImages(images: CloudinaryImageReference[]): Promise<void> {
  const references = images.filter((image) => image.filename && image.filename !== 'placeholder-campground-image');

  const results = await Promise.allSettled(
    references.map((image) => cloudinary.uploader.destroy(image.filename)),
  );

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('Cloudinary delete error:', result.reason);
    }
  });
}
