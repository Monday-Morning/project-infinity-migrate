import { performQuery } from '../config/mysql.js';
import { eachOfSeries } from 'async';
import { isValidObjectId } from '../config/mongoose.js';
import { testGmail, testNitrMail } from '../utils/regex.js';

import Logger from '../utils/winston.js';
const log = new Logger('User Migrate');

import userModel from '../models/user.model.js';
import { deleteAllImages, deleteManyImages, deleteSingleImage, fixExtension, migrateProfilePicture } from './media.js';

function getListOfRecords(startId, endId) {
  return performQuery(
    `SELECT user_id, mongo_id FROM users WHERE user_role > 0 AND user_id >= ${startId ?? 0} AND user_id <= ${
      endId ?? 1000000
    } ORDER BY user_id ASC;`
  );
}

function getRecord(id) {
  return performQuery(`SELECT * FROM users WHERE user_id="${id}";`);
}

function updateMapping(oldId, newId) {
  return performQuery(`UPDATE users SET mongo_id="${newId}" WHERE user_id="${oldId}";`);
}

function convertRecordToDocument(oldUser, picture) {
  return {
    fullName: oldUser.user_display_name,
    email: testGmail(oldUser.user_email)
      ? oldUser.user_email
      : testGmail(oldUser.user_login)
      ? oldUser.user_login
      : `transfer-${oldUser.user_login.toString().trim().replace(/\s|@/g, '')}@gmail.com`.replace(/\W@/g, '@'),
    accountType: 2,
    nitrMail: testNitrMail(oldUser.user_email)
      ? oldUser.user_email
      : testNitrMail(oldUser.user_login)
      ? oldUser.user_login
      : `transfer-${oldUser.user_login.toString().trim().replace(/\s|@/g, '')}@nitrkl.ac.in`.replace(/\W@/g, '@'),
    picture,
    oldUserId: oldUser.user_id,
    oldUserName: oldUser.user_login,
    isNewsletterSubscribed: true,
    profile: {
      bio: oldUser.user_bio || undefined,
      facebook: oldUser.user_facebook || undefined,
      twitter: oldUser.user_twitter || undefined,
      website: oldUser.user_website || undefined,
    },
  };
}

function createDocument(newUser) {
  return userModel.create(newUser);
}

function updateDocument(id, newUser) {
  return userModel.findByIdAndUpdate(id, newUser, { new: true });
}

export function cleanSingleMigration(oldId, newId) {
  return Promise.all([
    oldId ? updateMapping(oldId, '') : Promise.resolve(),
    newId ? userModel.deleteOne({ _id: newId }) : Promise.resolve(),
    newId ? deleteSingleImage(`${newId}.jpeg`, true) : Promise.resolve(),
  ]);
}

export function cleanManyMigrations(oldIds, newIds) {
  return Promise.all([
    oldIds.length > 0
      ? performQuery(`UPDATE users SET mongo_id="" WHERE user_id IN (${oldIds.join(',')});`)
      : Promise.resolve(),
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
    performQuery(`UPDATE users SET mongo_id="";`),
    userModel.deleteMany({}),
    deleteAllImages('/user/', true),
  ]);
}

export async function migrateSingle(oldId) {
  try {
    log.info(`ID #${oldId} | Checking past migration...`);
    const [_oldUser] = await getRecord(oldId);
    if (isValidObjectId(_oldUser.mongo_id)) {
      const _deleteRecord = await userModel.findById(_oldUser.mongo_id);
      if (_deleteRecord) {
        log.info(`ID #${oldId} | Found past migration! Cleaning...`);
        await cleanSingleMigration(oldId, _oldUser.mongo_id);
      } else {
        log.info(`ID #${oldId} | No past migration found!`);
      }
    } else {
      log.info(`ID #${oldId} | No past migration found!`);
    }

    log.info(`ID #${oldId} | Checking for clashing Email IDs...`);

    const _userEmail = testGmail(_oldUser.user_email)
      ? _oldUser.user_email
      : testGmail(_oldUser.user_login)
      ? _oldUser.user_login
      : `transfer-${_oldUser.user_login.toString().trim().replace(/\s|@/g, '')}@gmail.com`.replace(/\W@/g, '@');

    const _checkUser = await userModel.exists({ email: _userEmail });

    log.info(`ID #${oldId} | Creating user record...`);
    const _formattedUser = convertRecordToDocument(_oldUser, undefined);
    const _newUser = !_checkUser
      ? await createDocument(_formattedUser)
      : await updateDocument(_checkUser._id, _formattedUser);

    log.info(`ID #${oldId} | Migrating profile picture...`);
    const _profilePicture = _oldUser.user_display_picture
      ? await migrateProfilePicture(
          `https://ik.imagekit.io/infinityA/uploads/user/${fixExtension(_oldUser.user_display_picture)}?tr=n-square`,
          _newUser._id
        )
      : undefined;

    if (_profilePicture) {
      log.info(`ID #${oldId} | Updating user profile picture...`);
      const _formattedUser1 = convertRecordToDocument(_oldUser, {
        store: _profilePicture.store,
        storePath: _profilePicture.storePath,
        blurhash: _profilePicture.blurhash,
      });
      await updateDocument(_newUser._id, _formattedUser1);
    } else {
      log.info(`ID #${oldId} | No profile picture found!`);
    }

    log.info(`ID #${oldId} | Mapping user records...`);
    await updateMapping(oldId, _newUser._id);

    log.info(`ID #${oldId} | User Successfully Migrated!`);
    return _newUser;
  } catch (error) {
    log.error(`ID #${oldId} | Could not migrate user: `, error);
    return null;
  }
}

export async function migrateMany(startId, endId) {
  try {
    log.info(`Retrieving ids in range...`);
    const _oldRecords = await getListOfRecords(startId, endId);
    log.info(`Retrieved ${_oldRecords.length} users.`);

    log.info(`Cleaning all past migrations...`);
    await cleanManyMigrations(
      _oldRecords.map((item) => item.user_id).filter((item) => item),
      _oldRecords.map((item) => (item.mongo_id ? item.mongo_id : undefined)).filter((item) => item)
    );

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.user_id} | Processing #${index + 1} of ${_oldRecords.length} users.`);
      const _newRecord = await migrateSingle(oldRecord.user_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All users migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate users: `, error);
    return null;
  }
}

export async function migrateAll() {
  try {
    log.info(`Retrieving all ids...`);
    const _oldRecords = await getListOfRecords();
    log.info(`Retrieved ${_oldRecords.length} users.`);

    log.info(`Cleaning all past migrations...`);
    await cleanAllMigrations();

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.user_id} | Processing #${index + 1} of ${_oldRecords.length} users.`);
      const _newRecord = await migrateSingle(oldRecord.user_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All users migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate users: `, error);
    return null;
  }
}
