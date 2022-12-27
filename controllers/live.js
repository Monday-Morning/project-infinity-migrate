import { eachOfSeries } from 'async';

import companyModel from '../models/company.model.js';
import liveModel from '../models/live.model.js';

import { performQuery } from '../config/mysql.js';

import Logger from '../utils/winston.js';
const log = new Logger('Companies Migrate');

function getListOfRecords(startId, endId) {
  return performQuery(
    `SELECT live.*, companies.mongo_id AS company_mongo_id FROM adamantium.live JOIN adamantium.companies ON live.company_id=companies.company_id WHERE live.live_id >= ${
      startId ?? 0
    } AND live.live_id <= ${endId ?? 100000} ORDER BY live.live_id ASC;`
  );
}

function getRecord(id) {
  return performQuery(
    `SELECT live.*, companies.mongo_id AS company_mongo_id FROM adamantium.live JOIN adamantium.companies ON live.company_id=companies.company_id WHERE live.live_id = ${id} ORDER BY live.live_id ASC;`
  );
}

function updateMapping(oldId, newId) {
  return performQuery(`UPDATE live SET mongo_id="${newId}" WHERE live_id="${oldId}";`);
}

const _degreeMap = {
  btech: 'B.Tech',
  mtech: 'M.Tech',
  mtechr: 'M.Tech (Research)',
  dual: 'Dual Degree M.Tech',
  rmsc: 'M.Sc',
  imsc: 'Integrated M.Sc',
  phd: 'PhD',
  som: 'School of Management',
  somanagement: 'School of Management',
};

const _branchMap = {
  1: 'Biotechnology & Biomedical Engineering',
  2: 'Ceramic Engineering',
  3: 'Chemical Engineering',
  4: 'Civil Engineering',
  5: 'Computer Science and Engineering',
  6: 'Department of Chemistry',
  7: 'Department of Humanities',
  8: 'Department of Life Science',
  9: 'Department of Mathematics',
  10: 'Department of Physics',
  11: 'Electrical Engineering',
  12: 'Electronics and Communication Engineering',
  13: 'Food Process Engineering',
  14: 'Industrial Design',
  15: 'Mechanical Engineering',
  16: 'Metallurgical and Materials Engineering',
  17: 'Mining Engineering',
  18: 'Planning and Architecture',
  19: 'School of Management',
  20: 'Department of Earth and Atmospheric Science',
  21: 'Electronics and Instrumentation Engineering',
  22: 'Safety Engineering',
  23: 'Department of Applied Geology',
};

function parseStudentsRecruited(studentsRecruited) {
  const _parsedStudents = JSON.parse(studentsRecruited);
  let _students = [];
  for (let _degree in _parsedStudents) {
    let _degreeStudents = _parsedStudents[_degree].map((branch) => {
      return branch.name.map((name) => ({
        degree: _degreeMap[_degree] ?? 'School of Management',
        branch: _branchMap[parseInt(branch.branch)] ?? '',
        name,
      }));
    });
    _students = _students.concat(_degreeStudents.reduce((a, b) => a.concat(b), []));
  }
  return _students;
}

function convertRecordToDocument(oldLive) {
  return {
    type:
      oldLive.live_type == 0
        ? 4
        : oldLive.category == 'normal'
        ? 1
        : oldLive.category == 'dream'
        ? 2
        : oldLive.category == 'sdream'
        ? 3
        : 0,
    company: oldLive.company_mongo_id,
    recruits: oldLive.students_recruited_count,
    year: oldLive.year,
    semester: oldLive.month > 5 ? 0 : 1,
    studentsRecruited: parseStudentsRecruited(oldLive.students_recruited),
    ctc: oldLive.ctc,
    benefits: oldLive.bonus == 0 ? '' : oldLive.bonus,
    date: new Date(oldLive.year, oldLive.month - 1, oldLive.day),
  };
}

function createDocument(newCompany) {
  return liveModel.create(newCompany);
}

function updateDocument(id, newCompany) {
  return liveModel.findByIdAndUpdate(id, newCompany, { new: true });
}

// export async function cleanSingleMigration(oldId, newId) {
//   return Promise.all([
//     // oldId ? updateMapping(oldId, '') : Promise.resolve(),
//     // newId ? liveModel.deleteOne({ _id: newId }) : Promise.resolve(),
//     newId ? deleteSingleImage(`${newId}.jpeg`, true) : Promise.resolve(),
//   ]);
// }

// export function cleanManyMigrations(oldIds, newIds) {
//   return Promise.all([
//     // oldIds.length > 0
//     //   ? performQuery(`UPDATE companies SET mongo_id="" WHERE company_id IN (${oldIds.join(',')});`)
//     //   : Promise.resolve(),
//     newIds.length > 0
//       ? deleteManyImages(
//           newIds.map((item) => `${item}.jpeg`),
//           true
//         )
//       : Promise.resolve(),
//   ]);
// }

// export function cleanAllMigrations() {
//   return Promise.all([
//     // performQuery(`UPDATE companies SET mongo_id="";`),
//     // liveModel.deleteMany({}),
//     deleteAllImages('/company/', true),
//   ]);
// }

export async function migrateSingle(oldId) {
  try {
    // log.info(`ID #${oldId} | Checking past migration...`);
    const [_oldLive] = await getRecord(oldId);
    // if (isValidObjectId(_oldLive.mongo_id)) {
    //   const _deleteRecord = await liveModel.findById(_oldLive.mongo_id);
    //   if (_deleteRecord) {
    //     log.info(`ID #${oldId} | Found past migration! Cleaning...`);
    //     await cleanSingleMigration(oldId, _oldLive.mongo_id);
    //   } else {
    //     log.info(`ID #${oldId} | No past migration found!`);
    //   }
    // } else {
    //   log.info(`ID #${oldId} | No past migration found!`);
    // }

    if (!(await companyModel.exists({ _id: _oldLive.company_mongo_id }))) {
      throw new Error('Company not found!');
    }

    log.info(`ID #${oldId} | Creating live record...`);
    const _formattedLive = convertRecordToDocument(_oldLive);

    log.info(`ID #${oldId} | Storing processed live...`);
    const _newLive = (await liveModel.exists({ _id: _oldLive.mongo_id }))
      ? await updateDocument(_oldLive.mongo_id, _formattedLive)
      : await createDocument(_formattedLive);

    log.info(`ID #${oldId} | Mapping live records...`);
    await updateMapping(oldId, _newLive._id);

    log.info(`ID #${oldId} | Live Successfully Migrated!`);
    return _newLive;
  } catch (error) {
    log.error(`ID #${oldId} | Could not migrate live: `, error);
    return null;
  }
}

export async function migrateMany(startId, endId) {
  try {
    log.info(`Retrieving ids in range...`);
    const _oldRecords = await getListOfRecords(startId, endId);
    log.info(`Retrieved ${_oldRecords.length} live entries.`);

    // log.info(`Cleaning all past migrations...`);
    // await cleanManyMigrations(
    //   _oldRecords.map((item) => item.live_id).filter((item) => item),
    //   _oldRecords.map((item) => (item.mongo_id ? item.mongo_id : undefined)).filter((item) => item)
    // );

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.user_id} | Processing #${index + 1} of ${_oldRecords.length} live entries.`);
      const _newRecord = await migrateSingle(oldRecord.live_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All live entries migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate live: `, error);
    return null;
  }
}

export async function migrateAll() {
  try {
    log.info(`Retrieving all ids...`);
    const _oldRecords = await getListOfRecords();
    log.info(`Retrieved ${_oldRecords.length} live entries.`);

    // log.info(`Cleaning all past migrations...`);
    // await cleanAllMigrations();

    const _newRecords = [];
    await eachOfSeries(_oldRecords, async (oldRecord, index) => {
      log.info(`ID #${oldRecord.live_id} | Processing #${index + 1} of ${_oldRecords.length} live entries.`);
      const _newRecord = await migrateSingle(oldRecord.live_id);
      _newRecords.push(_newRecord);
      return _newRecord;
    });

    log.info(`All live entries migrated!`);
    return _newRecords;
  } catch (error) {
    log.error(`Could not migrate live: `, error);
    return null;
  }
}
