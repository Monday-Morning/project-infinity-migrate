import fetch from 'node-fetch';
import { encode } from 'blurhash';
import canvas from 'canvas';
import { adamantiumA, infinityA } from '../config/imagekit.js';
import sharp from 'sharp';
import mongoose from 'mongoose';

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

export function getDefaultAuthor() {
  return {
    name: 'Team MM',
    details: '6269a756fd0601b182e327d5',
  };
}

async function convertRecordToDocument(
  id,
  imageType,
  imageBuffer,
  newFileName,
  newStore,
  recordLinkedTo,
  recordLinkModel
) {
  return {
    _id: id,
    authors: [getDefaultAuthor()],
    store: newStore ? 2 : 0,
    storePath: `/${imageType}/${newFileName}`,
    mediaType: 0,
    // blurhash: await encodeImageToBlurhash(imageBuffer),
    linkedTo: recordLinkedTo ? { reference: recordLinkedTo, onModel: recordLinkModel ?? 'Article' } : undefined,
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
  try {
    const _files = newStore
      ? await (
          await infinityA.listFiles({
            searchQuery: `name IN [${imageFileNames.toString()}]`,
          })
        ).map((item) => item.fileId)
      : await (
          await adamantiumA.listFiles({
            searchQuery: `name IN [${imageFileNames.toString()}]`,
          })
        ).map((item) => item.fileId);
    return Promise.all([
      recordIds ? mediaModel.deleteMany({ _id: recordIds }) : Promise.resolve(),
      newStore ? infinityA.bulkDeleteFiles(_files) : adamantiumA.bulkDeleteFiles(_files),
    ]);
  } catch (error) {
    log.error(`Could not delete profile pictures: `, error);
    return null;
  }
}

export async function deleteAllImages(folderPath, newStore, recordLinkedTo) {
  try {
    return Promise.all([
      newStore
        ? infinityA.deleteFolder(folderPath).catch((error) => {
            log.error(`Could not delete ImageKit folder: `, error);
            return Promise.resolve();
          })
        : adamantiumA.deleteFolder(folderPath).catch((error) => {
            log.error(`Could not delete ImageKit folder: `, error);
            return Promise.resolve();
          }),
      recordLinkedTo ? mediaModel.deleteMany({ 'linkedTo.onModel': recordLinkedTo }) : Promise.resolve(),
    ]);
  } catch (error) {
    log.error(`Could not delete folder: `, error);
    return null;
  }
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
    const _newMediaDocument = await convertRecordToDocument(id, 'user', _convertedImageBuffer, _newFileName, true);

    log.info(`Uploading image...`);
    await uploadImage('user', _convertedImageBuffer, _newFileName, ['user', [], true], true);
    log.info(`Image Uploaded.`);

    return _newMediaDocument;
  } catch (error) {
    log.error(`Could not migrate image: `, error);
    return null;
  }
}

export async function migrateArticleImage(imageUrl, articleId, isCover) {
  try {
    const _id = new mongoose.Types.ObjectId();
    log.info(`Parsing image url...`);
    const _newFileName = `${_id}.jpeg`;

    log.info(`Downloading image...`);
    const _imageBuffer = await downloadImage(imageUrl);

    log.info(`Convering to progressive jpeg...`);
    const _convertedImageBuffer = await convertToJpeg(_imageBuffer);

    log.info(`Processing document...`);
    const _newMediaDocument = await convertRecordToDocument(
      _id,
      isCover ? 'article/cover' : 'article/content',
      _convertedImageBuffer,
      _newFileName,
      false,
      articleId
    );

    log.info(`Saving document...`);
    await mediaModel.create(_newMediaDocument);

    log.info(`Uploading image...`);
    const _transformation = isCover ? decodeURI(imageUrl.split('/').slice(-1)).split('?')[1] : null;
    await uploadImage(
      isCover ? 'article/cover' : 'article/content',
      _convertedImageBuffer,
      _newFileName,
      [
        'article',
        isCover ? 'cover' : 'content',
        articleId,
        _transformation
          ? _transformation.includes('square')
            ? 'square'
            : _transformation.includes('rectangle')
            ? 'rectangle'
            : undefined
          : undefined,
        true,
      ],
      false
    );
    log.info(`Image Uploaded.`);

    return _newMediaDocument;
  } catch (error) {
    log.error(`Could not migrate image: `, error);
    return null;
  }
}

export async function migrateIssueCover(imageUrl, issueId) {
  try {
    log.info(`Parsing image url...`);
    const _newFileName = `${issueId}.jpeg`;

    log.info(`Downloading image...`);
    const _imageBuffer = await downloadImage(imageUrl);

    log.info(`Convering to progressive jpeg...`);
    const _convertedImageBuffer = await convertToJpeg(_imageBuffer);

    log.info(`Processing document...`);
    const _newMediaDocument = await convertRecordToDocument(
      issueId,
      'issue',
      _convertedImageBuffer,
      _newFileName,
      false,
      issueId,
      'Issue'
    );

    log.info(`Uploading image...`);
    await uploadImage('issue', _convertedImageBuffer, _newFileName, ['issue', issueId], false);
    log.info(`Image Uploaded.`);

    return _newMediaDocument;
  } catch (error) {
    log.error(`Could not migrate image: `, error);
    return null;
  }
}
