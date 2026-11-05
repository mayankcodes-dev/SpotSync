import cloudinaryPkg from 'cloudinary';
import multer from 'multer';

const cloudinary = cloudinaryPkg.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage: multer.StorageEngine = {
  _handleFile(_req, file, callback) {
    let completed = false;
    const complete = (error?: any, info?: Partial<Express.Multer.File>) => {
      if (completed) return;
      completed = true;
      callback(error, info);
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'SpotSync',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          complete(error || new Error('Cloudinary image upload failed.'));
          return;
        }

        complete(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
        });
      },
    );

    file.stream.on('error', (error) => complete(error));
    file.stream.pipe(uploadStream);
  },

  _removeFile(_req, file, callback) {
    if (!file.filename) {
      callback(null);
      return;
    }

    cloudinary.uploader.destroy(file.filename, (error) => callback(error || null));
  },
};

export { storage, cloudinary };
