const cloudinary = require("cloudinary").v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});
//console.log(process.env.CLOUDINARY_NAME);


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "images/",  // Folder name in Cloudinary where the images will be stored
        allowed_formats: ['jpg', 'png'],  // Allowed file formats
    },
});

// Use multer with the Cloudinary storage
const upload = multer({ storage: storage });
const ExtractMultipleImagesByIds = (req, res, next) => {//await is only valid inasync function 
    if (req.files && req.files.length > 0) {
        // Extract the image ID from the Cloudinary path (file.path)
        req.imageIds = req.files.map((file) => {
            // Split the path by '/' and get the last part (filename)
            return file.path.split('/').pop();
        });
    } else {
        req.imageIds = [];
    }
    next();
};
const ExtractImageByIds = (req, res, next) => {
    if (req.file) {
        req.imageIds = req.file.path;
    } else {
        req.imageIds = null;
    }
    next();
};


const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    console.log("Image delete result:", result);
    return result;
  } catch (error) {
    console.log("Image delete error:", error);
  }
};

const deleteVideo = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });

    console.log("Video delete result:", result);
    return result;
  } catch (error) {
    console.log("Video delete error:", error);
  }
};
const deleteBulkImages = async (public_ids) => {
    try {
        const deletePromises = public_ids.map(public_id => 
            cloudinary.uploader.destroy(public_id, { resource_type: 'image' })
        );
        // Wait for all deletions to complete
        const result = await Promise.all(deletePromises);
        console.log("Images deleted from Cloudinary: ", result);
        return result; // Return the result of Cloudinary deletions
    } catch (error) {
        console.log("Error deleting images from Cloudinary: ", error);
        throw error;
    }
};
const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "images/",
      resource_type: "image",
    });

    return result;
  } catch (error) {
    console.log("Error uploading image:", error);
    throw new Error("Image upload failed");
  }
};


module.exports={
    upload,
    ExtractImageByIds,
    ExtractMultipleImagesByIds,
    deleteBulkImages,
    deleteImage,
    uploadImage,
    deleteVideo
}