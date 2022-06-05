import fetch from 'node-fetch';
import { encode } from 'blurhash';
import canvas from 'canvas';
import { adamantiumA, infinityA } from '../config/imagekit.js';
import sharp from 'sharp';

import Logger from '../utils/winston.js';
const log = new Logger('Media Migrate');

import mediaModel from '../models/media.model.js';

async function downloadImage(imageUrl) {
  const _res = await fetch(imageUrl);
  return await _res.buffer();
}

function getImageData(image) {
  const _canvas = canvas.createCanvas(image.width, image.height);
  const _context = _canvas.getContext('2d');
  _context.drawImage(image, 0, 0);
  return _context.getImageData(0, 0, image.width, image.height);
}

async function encodeImageToBlurhash(imageBuffer) {
  const _image = await canvas.loadImage(imageBuffer);
  const _imageData = getImageData(_image);
  return encode(_imageData.data, _imageData.width, _imageData.height, 4, 4).toString().trim();
}

function convertToJpeg(imageBuffer) {
  return sharp(imageBuffer)
    .jpeg({
      quality: 100,
      progressive: true,
      force: true,
    })
    .toBuffer();
}

function uploadImage(imageType, imageBuffer, newFileName, tags, newStore) {
  return newStore
    ? infinityA.upload({
        file: imageBuffer,
        fileName: newFileName,
        tags,
        useUniqueFileName: false,
        folder: `/${imageType}/`,
      })
    : adamantiumA.upload({
        file: imageBuffer,
        fileName: newFileName,
        tags,
        useUniqueFileName: false,
        folder: `/${imageType}/`,
      });
}

function getDefaultAuthor() {
  return {
    name: 'Team MM',
    details: '6269a756fd0601b182e327d5',
  };
}

async function createDocument(id, imageType, imageBuffer, newFileName, newStore) {
  return {
    _id: id,
    authors: [getDefaultAuthor()],
    store: newStore ? 2 : 0,
    storePath: `/${imageType}/${newFileName}`,
    mediaType: 0,
    blurhash: await encodeImageToBlurhash(imageBuffer),
  };
}

export function fixExtension(imageUrl) {
  const _fileExtension = imageUrl.split('.').slice(-1).toString().toLowerCase();
  imageUrl = imageUrl.split('.');
  imageUrl[imageUrl.length - 1] = _fileExtension;
  return imageUrl.join('.');
}

export async function deleteSingleImage(imageFileName, newStore, recordId) {
  try {
    const [_file] = newStore
      ? await infinityA.listFiles({
          searchQuery: `name = "${imageFileName}"`,
        })
      : await adamantiumA.listFiles({
          searchQuery: `name = "${imageFileName}"`,
        });
    return Promise.all([
      recordId ? mediaModel.deleteOne({ _id: recordId }) : Promise.resolve(),
      newStore ? infinityA.deleteFile(_file.fileId) : adamantiumA.deleteFile(_file.fileId),
    ]);
  } catch (error) {
    log.error(`Could not delete profile picture: `, error);
    return null;
  }
}

export async function deleteManyImages(imageFileNames, newStore, recordIds) {
  const _files = newStore
    ? (
        await infinityA.listFiles({
          searchQuery: `name IN [${imageFileNames.toString()}]`,
        })
      ).map((item) => item.fileId)
    : (
        await adamantiumA.listFiles({
          searchQuery: `name IN [${imageFileNames.toString()}]`,
        })
      ).map((item) => item.fileId);
  return Promise.all([
    recordIds ? mediaModel.deleteMany({ _id: recordIds }) : Promise.resolve(),
    newStore ? infinityA.bulkDeleteFiles(_files) : adamantiumA.bulkDeleteFiles(_files),
  ]);
}

export async function migrateProfilePicture(imageUrl, id) {
  try {
    log.info(`Parsing image url...`);
    const _newFileName = `${id}.jpeg`;

    log.info(`Downloading image...`);
    const _imageBuffer = await downloadImage(imageUrl);

    log.info(`Convering to progressive jpeg...`);
    const _convertedImageBuffer = await convertToJpeg(_imageBuffer);

    log.info(`Processing document...`);
    const _newMediaDocument = await createDocument(id, 'user', _convertedImageBuffer, _newFileName, true);

    log.info(`Uploading image...`);
    await uploadImage('user', _convertedImageBuffer, _newFileName, ['user', [], true], true);
    log.info(`Image Uploaded.`);

    return _newMediaDocument;
  } catch (error) {
    log.error(`Could not migrate image: `, error);
    return null;
  }
}
