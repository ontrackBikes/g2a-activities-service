const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const generateVariants =
  async (
    sourcePath,
    destinationPaths
  ) => {

    await Promise.all(
      Object.values(destinationPaths).map((destinationPath) =>
        fs.promises.mkdir(path.dirname(destinationPath), { recursive: true })
      )
    );

    await sharp(sourcePath)
      .resize(1200)
      .webp({ quality: 85 })
      .toFile(destinationPaths.large);

    await sharp(sourcePath)
      .resize(600)
      .webp({ quality: 85 })
      .toFile(destinationPaths.medium);

    await sharp(sourcePath)
      .resize(200)
      .webp({ quality: 80 })
      .toFile(destinationPaths.thumb);
  };

module.exports = {
  generateVariants,
};
