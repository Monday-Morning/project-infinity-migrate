import { performQuery } from '../config/mysql.js';
import { toMarkdown } from '../utils/content.js';
import { eachOfSeries } from 'async';
import tagModel from '../models/tag.model.js';

import Logger from '../utils/winston.js';
const log = new Logger('Admin Tag Migrate');

function getListOfRecords() {
  return performQuery(`SELECT admin_label_id FROM admin_labels ORDER BY admin_label_id ASC;`);
}

function getRecord(id) {
  return performQuery(`SELECT admin_label_text FROM admin_labels WHERE admin_label_id="${id}";`);
}

function convertRecordToDocument(oldTag) {
  return {
    name: toMarkdown(oldTag.admin_label_text.toString().trim()),
    isAdmin: true,
    adminColor: 'ffffff',
  };
}

function saveDocument(newTag) {
  return tagModel.create(newTag);
}

function updateMapping(oldId, newId) {
  return performQuery(`UPDATE admin_labels SET mongo_id="${newId}" WHERE admin_label_id="${oldId}";`);
}

export function cleanMigration() {
  return Promise.all([performQuery(`UPDATE admin_labels SET mongo_id="";`), tagModel.deleteMany({ isAdmin: true })]);
}

export async function migrate() {
  try {
    // Clean Past Migrations
    log.info(`Cleaning past migrations.`);
    await cleanMigration();

    // Get all IDs
    log.info(`Retrieving all`);
    const _oldIds = await (await getListOfRecords()).map((_item) => _item.admin_label_id);
    log.info(`Retrieved ${_oldIds.length} tags.`);

    // Iterate over each id
    const _tagData = [];
    await eachOfSeries(_oldIds, async (oldId, index) => {
      log.info(`Processing #${index + 1} of ${_oldIds.length} admin tags.`);
      const [_oldTag] = await getRecord(oldId);
      const _formattedTag = convertRecordToDocument(_oldTag);
      const _newTag = await saveDocument(_formattedTag);
      _tagData.push(_newTag);
      await updateMapping(oldId, _newTag._id);
    });
    log.info(`All admin tags migrated.`);
    return _tagData;
  } catch (error) {
    log.error(`Could not migrate admin tags: `, error);
    return null;
  }
}
