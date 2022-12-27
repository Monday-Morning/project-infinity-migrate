import { eachOfSeries } from 'async';

import companyModel from '../models/company.model.js';

import { performQuery } from '../config/mysql.js';
import { deleteAllImages, deleteManyImages, deleteSingleImage, migrateCompanyLogo } from './media.js';
import { isValidObjectId } from '../config/mongoose.js';

import Logger from '../utils/winston.js';
const log = new Logger('Companies Migrate');

function getListOfRecords(startId, endId) {
  return performQuery(
    `SELECT companies.*, count(live.live_id) FROM companies LEFT JOIN live ON companies.company_id=live.company_id WHERE companies.company_id >= ${
      startId ?? 0
    } AND companies.company_id <= ${
      endId ?? 100000
    } GROUP BY companies.company_id HAVING count(live.live_id) > 0 ORDER BY companies.company_id;`
  );
}

function getRecord(id) {
  return performQuery(
    `SELECT companies.*, count(live.live_id) FROM companies LEFT JOIN live ON companies.company_id=live.company_id WHERE companies.company_id = ${id} GROUP BY companies.company_id ORDER BY companies.company_id;`
  );
}

function updateMapping(oldId, newId) {
  return performQuery(`UPDATE companies SET mongo_id="${newId}" WHERE company_id="${oldId}";`);
}

function convertRecordToDocument(oldCompany, logo) {
  return {
    name: oldCompany.company_name,
    alias: [oldCompany.company_alias],
    location: oldCompany.company_location,
    logo,
  };
}

function createDocument(newCompany) {
  return companyModel.create(newCompany);
}

function updateDocument(id, newCompany) {
  return companyModel.findByIdAndUpdate(id, newCompany, { new: true });
}

export async function cleanSingleMigration(oldId, newId) {
  return Promise.all([
    // oldId ? updateMapping(oldId, '') : Promise.resolve(),
    // newId ? companyModel.deleteOne({ _id: newId }) : Promise.resolve(),
    newId ? deleteSingleImage(`${newId}.jpeg`, true) : Promise.resolve(),
  ]);
}

export function cleanManyMigrations(oldIds, newIds) {
  return Promise.all([
    // oldIds.length > 0
    //   ? performQuery(`UPDATE companies SET mongo_id="" WHERE company_id IN (${oldIds.join(',')});`)
    //   : Promise.resolve(),
    newIds.length > 0
      ? deleteManyImages(
          newIds.map((item) => `${item}.jpeg`),
          true
        )
      : Promise.resolve(),
  ]);
}

export function cleanAllMigrations() {
  return Promise.all([
    // performQuery(`UPDATE companies SET mongo_id="";`),
    // companyModel.deleteMany({}),
    deleteAllImages('/company/', true),
  ]);
}

export async function migrateSingle(oldId) {
  try {
    log.info(`ID #${oldId} | Checking past migration...`);
    const [_oldCompany] = await getRecord(oldId);
    if (isValidObjectId(_oldCompany.mongo_id)) {
      const _deleteRecord = await companyModel.findById(_oldCompany.mongo_id);
      if (_deleteRecord) {
        log.info(`ID #${oldId} | Found past migration! Cleaning...`);
        await cleanSingleMigration(oldId, _oldCompany.mongo_id);
      } else {
        log.info(`ID #${oldId} | No past migration found!`);
      }
    } else {
      log.info(`ID #${oldId} | No past migration found!`);
    }

    log.info(`ID #${oldId} | Creating company record...`);
    const _formattedCompany = convertRecordToDocument(_oldCompany, undefined);

    log.info(`ID #${oldId} | Storing processed company...`);
    const _newCompany = await createDocument(_formattedCompany);

    log.info(`ID #${oldId} | Migrating company logo...`);
    const _companyLogo = _oldCompany.company_avatar
      ? await migrateCompanyLogo(
          `https://ik.imagekit.io/infinityA/uploads/company/${fixExtension(_oldCompany.company_avatar)}`,
          _newCompany._id
        )
      : undefined;

    if (_companyLogo) {
      log.info(`ID #${oldId} | Updating company logo...`);
      const _formattedCompany1 = convertRecordToDocument(_oldCompany, {
        store: _companyLogo.store,
        storePath: _companyLogo.storePath,
        blurhash: _companyLogo.blurhash,
      });
      await updateDocument(_newCompany._id, _formattedCompany1);
    } else {
      log.info(`ID #${oldId} | No company logo found!`);
    }

    log.info(`ID #${oldId} | Mapping company records...`);
    await updateMapping(oldId, _newCompany._id);

    log.info(`ID #${oldId} | Company Successfully Migrated!`);
    return _newCompany;
  } catch (error) {
    log.error(`ID #${oldId} | Could not migrate company: `, error);
    return null;
  }
}

export async function migrateMany(startId, endId) {
  try {
    log.info(`Retrieving ids in range...`);
    const _oldRecords = await getListOfRecords(startId, endId);
    log.info(`Retrieved ${_oldRecords.length} companies.`);

    log.info(`Cleaning all past migrations...`);
    await cleanManyMigrations(
      _oldRecords.map((item) => item.company_id).filter((item) => item),
      _oldRecords.map((item) => (item.mongo_id ? item.mongo_id : undefined)).filter((item) => item)
    );

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.user_id} | Processing #${index + 1} of ${_oldRecords.length} companies.`);
      const _newRecord = await migrateSingle(oldRecord.company_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All companies migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate companies: `, error);
    return null;
  }
}

export async function migrateAll() {
  try {
    log.info(`Retrieving all ids...`);
    const _oldRecords = await getListOfRecords();
    log.info(`Retrieved ${_oldRecords.length} companies.`);

    log.info(`Cleaning all past migrations...`);
    await cleanAllMigrations();

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.company_id} | Processing #${index + 1} of ${_oldRecords.length} companies.`);
      const _newRecord = await migrateSingle(oldRecord.company_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All companies migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate companies: `, error);
    return null;
  }
}
