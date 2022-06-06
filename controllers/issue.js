import { performQuery } from '../config/mysql.js';
import { deleteSingleImage, migrateIssueCover } from './media.js';
import issueModel from '../models/issue.model.js';
import mongoose from 'mongoose';

function getListOfRecords(startId, endId) {
  return performQuery(
    `SELECT issue_id FROM issues WHERE issue_id <= ${startId ?? 0} AND issue_id >= ${
      endId ?? 1000
    } ORDER BY issue_id ASC;`
  );
}

function getRecord(id) {
  return performQuery(`SELECT * FROM issues WHERE issue_id="${id}";`);
}

function getIssueFeatured(ids) {
  return performQuery(`SELECT mongo_id FROM posts WHERE post_id IN (${ids.toString()});`);
}

function getIssueArticles(startDate, endDate, postIds) {
  return performQuery(
    `SELECT mongo_id FROM posts WHERE post_id IN (${postIds.toString()}) OR post_publish_date BETWEEN "${moment(
      startDate
    ).format('YYYY-MM-DD')}" AND "${moment(endDate).format('YYYY-MM-DD')}";`
  );
}

function uploadCoverPicture(fileName, issueId) {
  return fileName ? migrateIssueCover(`https://ik.imagekit.io/adamantiumA/uploads/issue/${fileName}`, issueId) : null;
}

function createDocument(newIssue) {
  return issueModel.create(newIssue);
}

function updateMapping(oldId, newId) {
  return performQuery(`UPDATE issues SET mongo_id="${newId}" WHERE issue_id="${oldId}";`);
}

function convertRecordToDocument(oldIssue, thumbnail, articles, featured, issueId) {
  return {
    _id: issueId,
    name: oldIssue.issue_name,
    thumbnail,
    isPublished: true,
    startDate: new Date(oldIssue.start_date),
    endDate: new Date(oldIssue.end_date),
    articles,
    featured,
  };
}

export async function cleanSingleMigration(oldId, newId) {
  return Promise.all([
    updateMapping(oldId, ''),
    issueModel.findByIdAndDelete(newId),
    deleteSingleImage(`${newId}.jpeg`, false),
  ]);
}

export async function migrateSingle(oldId) {
  try {
    log.info(`ID #${oldId} | Checking past migration...`);
    const [_oldIssue] = await getRecord(oldId);
    if (isValidObjectId(_oldIssue.mongo_id)) {
      const _deleteRecord = await issueModel.findById(_oldIssue.mongo_id);
      if (_deleteRecord) {
        log.info(`ID #${oldId} | Found past migration! Cleaning...`);
        await cleanSingleMigration(oldId, _oldIssue.mongo_id);
      } else {
        log.info(`ID #${oldId} | No past migration found!`);
      }
    } else {
      log.info(`ID #${oldId} | No past migration found!`);
    }

    const _featuredTop4 = [...JSON.parse(_oldIssue.featured_top_4)];
    const _featuredSlider = [...JSON.parse(_oldIssue.featured_posts)];

    const _issueArticles = await (
      await getIssueArticles(new Date(_oldIssue.start_date), new Date(_oldIssue.end_date), [
        ..._featuredTop4,
        ..._featuredSlider,
      ])
    )
      .map((_item) => _item.mongo_id)
      .filter((_item) => _item);
    const _featuredArticles = await (await getIssueFeatured([..._featuredTop4, ..._featuredSlider].slice(0, 5)))
      .map((_item) => _item.mongo_id)
      .filter((_item) => _item);

    const issueId = new mongoose.Types.ObjectId();

    const _cover = await uploadCoverPicture(_oldIssue.thumbnail, issueId);

    const _formattedIssue = convertRecordToDocument(
      _oldIssue,
      {
        store: _cover?.store,
        storePath: _cover?.storePath || 'no-path',
        blurhash: _cover?.blurhash,
      },
      _issueArticles,
      _featuredArticles,
      issueId
    );

    const _newIssue = await issueModel.create(_formattedIssue);
    await updateMapping(oldId, _newIssue._id);

    log.info(`Issue succesfully migrated.`);
    return _newIssue;
  } catch (error) {
    log.error(`Could not migrate users: `, error);
    return null;
  }
}
