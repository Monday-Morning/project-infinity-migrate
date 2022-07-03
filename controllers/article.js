import { performQuery } from '../config/mysql.js';
import { eachOfSeries } from 'async';
import { isValidObjectId } from '../config/mongoose.js';
import categoryMapModel from '../models/categoryMap.model.js';
import getAPIResponse from '../utils/getApiResponse.js';
import { parseContent } from '../utils/content.js';
// import { testGmail, testNitrMail } from '../utils/regex.js';

import Logger from '../utils/winston.js';
import articleModel from '../models/article.model.js';
import tagModel from '../models/tag.model.js';
import userModel from '../models/user.model.js';
import { getDefaultAuthor, migrateArticleImage, deleteManyImages, deleteAllImages } from './media.js';
import mongoose from 'mongoose';
const log = new Logger('Article Migrate');

function getListOfRecords(startId, endId) {
  return performQuery(
    `SELECT post_id, mongo_id, media_ids FROM posts WHERE post_type = 1 AND post_publish_status = 0 AND post_id >= ${
      startId ?? 0
    } AND post_id <= ${endId ?? 1000000} ORDER BY post_id DESC;`
  );
}

function getRecord(id) {
  return performQuery(`SELECT * FROM posts WHERE post_id="${id}";`);
}

function getAllCategories(number) {
  return categoryMapModel.find({ number });
}

function getAdminLabels(postId) {
  return performQuery(
    `SELECT * FROM post_admin_labels_map JOIN admin_labels ON post_admin_labels_map.admin_label_id=admin_labels.admin_label_id WHERE post_admin_labels_map.post_id="${postId}";`
  );
}

function getAuthors(postId) {
  return performQuery(
    `SELECT * FROM post_author_map JOIN users ON post_author_map.user_id=users.user_id WHERE post_author_map.post_id="${postId}";`
  );
}

function getChildCategories(postId) {
  return performQuery(
    `SELECT * FROM post_category_map JOIN post_categories ON post_category_map.post_category_id=post_categories.post_category_id WHERE post_category_map.post_id="${postId}" AND post_categories.m_number>0;`
  );
}

function getPostTags(postId) {
  return performQuery(
    `SELECT * FROM post_tag_map JOIN post_tag ON post_tag_map.post_tag_id=post_tag.post_tag_id WHERE post_tag_map.post_id="${postId}";`
  );
}

async function parseAuthors(postId) {
  try {
    log.info(`ID #${postId} | Parsing authors...`);
    const _oldAuthors = (await getAuthors(postId)).map((oldAuthor) => oldAuthor.mongo_id);
    log.info(`ID #${postId} | Authors Parsed.`);
    return (await userModel.find({ _id: _oldAuthors }))
      .map((newAuthor) => ({
        name: newAuthor.fullName,
        team: 0,
        details: newAuthor._id,
      }))
      .filter((item) => item.details && item.details !== '');
  } catch (error) {
    log.error(`ID #${postId} | Unable to parse authors: `, error);
    throw error;
  }
}

async function parseCategories(postId) {
  try {
    log.info(`ID #${postId} | Parsing categories...`);
    const _oldCategories = await getChildCategories(postId);
    const _categoryNumbers = [];
    await eachOfSeries(_oldCategories, async (oldCategory) => {
      _categoryNumbers.push(oldCategory.m_number);

      _categoryNumbers.push(
        oldCategory.m_number >= 1000
          ? Math.floor(oldCategory.m_number / 100)
          : oldCategory.m_number >= 100
          ? Math.floor(oldCategory.m_number / 10)
          : oldCategory.m_number >= 10
          ? Math.floor(oldCategory.m_number / 10)
          : null
      );

      _categoryNumbers.push(
        oldCategory.m_number >= 1000
          ? Math.floor(oldCategory.m_number / 1000)
          : oldCategory.m_number >= 100
          ? Math.floor(oldCategory.m_number / 100)
          : null
      );
    });

    log.info(`ID #${postId} | Categories Parsed.`);
    const _newCats = (await getAllCategories(_categoryNumbers)).map((newCategory) => ({
      subcategory: newCategory.parent?.reference ? true : false,
      number: newCategory.number,
      reference: newCategory._id,
    }));
    return _newCats;
  } catch (error) {
    log.error('ID #${postId} | Unable to parse categories: ', error);
    throw error;
  }
}

async function parseTags(postId) {
  try {
    log.info(`ID #${postId} | Parsing tags...`);
    const _oldPostTags = (await getPostTags(postId)).map((oldTag) => oldTag.mongo_id);
    const _oldAdminLabels = (await getAdminLabels(postId)).map((oldLabel) => oldLabel.mongo_id);
    log.info(`ID #${postId} | Tags Parsed`);
    return (await tagModel.find({ _id: [..._oldPostTags, ..._oldAdminLabels] })).map((_newTag) => ({
      name: _newTag.name,
      isAdmin: _newTag.isAdmin,
      reference: _newTag._id,
    }));
  } catch (error) {
    log.error('ID #${postId} | Unable to parse tags: ', error);
    throw error;
  }
}

async function parseCoverMedia(fileName, postId, articleId) {
  try {
    log.info(`ID #${postId} | Parsing cover media...`);
    const _square = await migrateArticleImage(
      `https://ik.imagekit.io/adamantiumA/uploads/post/${fileName}?tr=n-square`,
      articleId,
      true
    );
    const _rectangle = await migrateArticleImage(
      `https://ik.imagekit.io/adamantiumA/uploads/post/${fileName}?tr=n-rectangle`,
      articleId,
      true
    );
    return {
      square: _square._id,
      rectangle: _rectangle._id,
    };
  } catch (error) {
    log.error(`ID #${postId} | Unable to parse cover media: `, error);
    throw error;
  }
}

function convertRecordToDocument(
  id,
  oldArticle,
  users,
  categories,
  tags,
  coverMedia,
  content,
  createdBy,
  updatedBy,
  readTime
) {
  return {
    _id: id,
    articleType: 0,
    title: oldArticle.post_title,
    inshort: oldArticle.post_excerpt,
    oldArticleId: oldArticle.post_id,
    users,
    categories,
    tags,
    coverMedia,
    approvalStatus: oldArticle.post_publish_status === 4 ? false : true,
    publishStatus:
      oldArticle.post_publish_status === 0
        ? 1
        : oldArticle.post_publish_status === 1
        ? 0
        : oldArticle.post_publish_status === 2
        ? 2
        : oldArticle.post_publish_status === 3
        ? 3
        : 0,
    isInstituteRestricted: oldArticle.restrict_to_lan === 1 ? true : false,
    content,
    engagementCount: {
      hits: oldArticle.post_hits,
      comments: oldArticle.post_comment_count,
    },
    readTime,
    timeSpent: readTime,
    createdAt: oldArticle.post_created === '0000-00-00 00:00:00' ? undefined : new Date(oldArticle.post_created),
    createdBy: !createdBy ? getDefaultAuthor().details : createdBy,
    updatedAt: oldArticle.post_modified === '0000-00-00 00:00:00' ? undefined : new Date(oldArticle.post_modified),
    updatedBy: !updatedBy ? getDefaultAuthor().details : updatedBy,
  };
}

function updateMapping(oldId, newId, mediaIds) {
  return performQuery(
    `UPDATE posts SET mongo_id="${newId}", media_ids="${mediaIds?.join()}" WHERE post_id="${oldId}";`
  );
}

function insertUserMapping(userIds, articleId) {
  return userModel.updateMany(
    { _id: userIds },
    {
      $push: {
        contributions: {
          model: 'Article',
          reference: articleId,
        },
      },
    }
  );
}

function removeUserMapping(userIds, articleId) {
  return userModel.updateMany(
    { _id: userIds },
    {
      $pull: {
        contributions: {
          reference: articleId,
        },
      },
    }
  );
}

export async function cleanSingleMigration(oldId, newId) {
  try {
    const [[_oldRecord], _newRecord] = await Promise.all([getRecord(oldId), articleModel.findById(newId)]);
    const _imageRecords = _oldRecord.media_ids.split(',').filter((item) => item);
    const _imageFileNames = _imageRecords.map((item) => `${item}.jpeg`);
    return Promise.all([
      // updateMapping(oldId, '', null),
      deleteManyImages(_imageFileNames, false, _imageRecords),
      // removeUserMapping(
      //   _newRecord.users.map((item) => item.details),
      //   newId
      // ),
      // articleModel.findByIdAndDelete(newId),
    ]);
  } catch (error) {
    log.error(`Could not clean migration: `, error);
  }
}

export async function cleanAllMigrations() {
  try {
    return Promise.all([
      // performQuery(`UPDATE posts SET mongo_id="", media_ids="";`),
      deleteAllImages('/article/'),
      // userModel.updateMany({}, { contributions: [] }),
      // articleModel.deleteMany({}),
    ]);
  } catch (error) {
    log.error(`Could not clean migrations: `, error);
  }
}

export async function migrateSingle(oldId) {
  try {
    log.info(`ID #${oldId} | Checking past migration...`);
    const [_oldArticle] = await getRecord(oldId);
    if (isValidObjectId(_oldArticle.mongo_id)) {
      const _deleteRecord = await articleModel.findById(_oldArticle.mongo_id);
      if (_deleteRecord) {
        log.info(`ID #${oldId} | Found past migration! Cleaning...`);
        await cleanSingleMigration(oldId, _oldArticle.mongo_id);
      } else {
        log.info(`ID #${oldId} | No past migration found!`);
      }
    } else {
      log.info(`ID #${oldId} | No past migration found!`);
    }

    const _id = new mongoose.Types.ObjectId();

    const [_apiResponse, [_createdBy], [_updatedBy]] = await Promise.all([
      getAPIResponse(oldId),
      performQuery(
        `SELECT users.mongo_id FROM users JOIN posts ON posts.post_created_by=users.user_id WHERE post_id="${oldId}";`
      ),
      performQuery(
        `SELECT users.mongo_id FROM users JOIN posts ON posts.post_modified_by=users.user_id WHERE post_id="${oldId}";`
      ),
    ]);

    const _parsedAuthors = await parseAuthors(oldId);
    const _parsedCategories = await parseCategories(oldId);
    const _parsedTags = await parseTags(oldId);
    const _parsedCoverMedia = await parseCoverMedia(_apiResponse.post.featured_image, oldId, _id);

    const [_parsedContent, _parsedMedia, _readTime] = await parseContent(_apiResponse.post.post_content, _id);

    const _formattedArticle = convertRecordToDocument(
      _id,
      _oldArticle,
      _parsedAuthors,
      _parsedCategories,
      _parsedTags,
      _parsedCoverMedia,
      _parsedContent,
      _createdBy?.mongo_id,
      _updatedBy?.mongo_id,
      _readTime
    );

    log.info(`ID #${oldId} | Storing processed article...`);
    const _newArticle = await articleModel.create(_formattedArticle);

    log.info(`ID #${oldId} | Updating article mapping...`);
    await updateMapping(oldId, _newArticle._id, [
      _parsedCoverMedia.square,
      _parsedCoverMedia.rectangle,
      ..._parsedMedia,
    ]);

    log.info(`ID #${oldId} | Updating user mapping...`);
    await insertUserMapping(
      _parsedAuthors.map((item) => item.details),
      _id
    );

    log.info(`ID #${oldId} | Article Stored.`);
    return _newArticle;
  } catch (error) {
    log.error(`ID #${oldId} | Could not migrate article: `, error);
    return null;
  }
}

export async function migrateMany(startId, endId) {
  try {
    log.info(`Retrieving ids in range...`);
    const _oldRecords = await getListOfRecords(startId, endId);
    log.info(`Retrieved ${_oldRecords.length} users.`);

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.post_id} | Processing #${index + 1} of ${_oldRecords.length} articles.`);
      const _newRecord = await migrateSingle(oldRecord.post_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All articles migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate articles: `, error);
    return null;
  }
}
