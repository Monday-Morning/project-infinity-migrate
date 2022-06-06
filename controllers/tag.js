import { performQuery } from '../config/mysql.js';
import { toMarkdown } from '../utils/content.js';
import { eachOfSeries } from 'async';
import tagModel from '../models/tag.model.js';

import Logger from '../utils/winston.js';
const log = new Logger('Post Tag Migrate');

function getListOfRecords() {
  return performQuery(`SELECT post_tag_id FROM post_tag ORDER BY post_tag_id ASC;`);
}

function getRecord(id) {
  return performQuery(`SELECT post_tag_text FROM post_tag WHERE post_tag_id="${id}";`);
}

function convertRecordToDocument(oldTag) {
  return {
    name: toMarkdown(oldTag.post_tag_text.toString().trim()),
    isAdmin: false,
    adminColor: 'ffffff',
  };
}

function saveDocument(newTag) {
  return tagModel.create(newTag);
}

function updateMapping(oldId, newId) {
  return performQuery(`UPDATE post_tag SET mongo_id="${newId}" WHERE post_tag_id="${oldId}";`);
}

export function cleanMigration() {
  return Promise.all([performQuery(`UPDATE post_tag SET mongo_id="";`), tagModel.deleteMany({ isAdmin: false })]);
}

export async function migrate() {
  try {
    // Clean Past Migrations
    log.info(`Cleaning past migrations.`);
    await cleanMigration();

    // Get all IDs
    log.info(`Retrieving all`);
    const _oldIds = await (await getListOfRecords()).map((_item) => _item.post_tag_id);
    log.info(`Retrieved ${_oldIds.length} tags.`);

    // Iterate over each id
    const _tagData = [];
    await eachOfSeries(_oldIds, async (oldId, index) => {
      log.info(`Processing #${index + 1} of ${_oldIds.length} tags.`);
      const [_oldTag] = await getRecord(oldId);
      const _formattedTag = convertRecordToDocument(_oldTag);
      const _newTag = await saveDocument(_formattedTag);
      _tagData.push(_newTag);
      await updateMapping(oldId, _newTag._id);
    });
    log.info(`All tags migrated.`);
    return _tagData;
  } catch (error) {
    log.error(`Could not migrate tags: `, error);
    return null;
  }
}
