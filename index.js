/// Load environment configs
import 'dotenv/config';

// Load logger
import Winston from './utils/winston.js';
const log = new Winston('Main');

// Import all modules
import express from 'express';
import './config/mongoose.js';
import './config/mysql.js';
import {
  cleanAllMigrations as cleanAllUserMigrations,
  cleanSingleMigration as cleanSingleUserMigration,
  migrateAll as migrateAllUsers,
  migrateMany as migrateManyUsers,
  migrateSingle as migrateSingleUser,
  updateSingleUserContribution,
} from './controllers/users.js';
import { migrate as migrateTags } from './controllers/tag.js';
import { migrate as migrateAdminTags } from './controllers/adminTag.js';
import {
  cleanSingleMigration as cleanSingleArticleMigration,
  migrateMany as migrateManyArticles,
  migrateSingle as migrateSingleArticle,
} from './controllers/article.js';
import {
  migrateSingle as migrateSinglePhotostory,
  migrateMany as migrateManyPhotostories,
  cleanSingleMigration as cleanSinglePhotostoryMigration,
} from './controllers/photostory.js';
import { migrateSingle as migrateSingleIssue } from './controllers/issue.js';
import {
  migrateSingle as migrateSingleCompany,
  migrateMany as migrateManyCompanies,
  migrateAll as migrateAllCompanies,
} from './controllers/companies.js';
import { checkServer, reloadServer } from './controllers/server.js';

const app = express();

async function requestHandler(methodResponse, sendResponse) {
  const _res = await methodResponse;
  if (!_res) {
    sendResponse.status(500);
    return sendResponse.json({
      status: 500,
      message: 'There were errors. See logs for more information.',
      data: _res,
    });
  }
  sendResponse.status(200);
  return sendResponse.json({
    status: 200,
    message: 'All tasks completed sucessfully. See logs for more information.',
    data: _res,
  });
}

/**
 * User Migration Endpoints
 */
app.use('/users/migrate/single/:userId', (req, res) =>
  requestHandler(migrateSingleUser(parseInt(req.params.userId)), res)
);

app.use('/users/migrate/many/:startId/:endId', (req, res) =>
  requestHandler(migrateManyUsers(req.params.startId, req.params.endId), res)
);

app.use('/users/migrate/all', (_req, res) => requestHandler(migrateAllUsers(), res));

app.use('/users/migrate/contributions/:userId', (req, res) =>
  requestHandler(updateSingleUserContribution(req.params.userId), res)
);

app.use('/users/clean/single/:oldId/:newId', (req, res) =>
  requestHandler(cleanSingleUserMigration(parseInt(req.params.oldId), parseInt(req.params.newId)), res)
);

app.use('/users/clean/all', (_req, res) => requestHandler(cleanAllUserMigrations(), res));

/**
 * Tag Migration Endpoints
 */
app.use('/tag/migrate/all', (_req, res) => requestHandler(migrateTags(), res));

app.use('/adminTag/migrate/all', (_req, res) => requestHandler(migrateAdminTags(), res));

/**
 * Article Migration Endpoints
 */
app.use('/article/migrate/single/:articleId', (req, res) =>
  requestHandler(migrateSingleArticle(parseInt(req.params.articleId)), res)
);

app.use('/article/migrate/many/:startId/:endId', (req, res) =>
  requestHandler(migrateManyArticles(parseInt(req.params.startId), parseInt(req.params.endId)), res)
);

app.use('/article/clean/single/:oldId/:newId', (req, res) =>
  requestHandler(cleanSingleArticleMigration(parseInt(req.params.oldId), req.params.newId), res)
);

/**
 * Photostory Migration Endpoints
 */
app.use('/photostory/migrate/single/:storyId', (req, res) =>
  requestHandler(migrateSinglePhotostory(parseInt(req.params.storyId)), res)
);

app.use('/photostory/migrate/many/:startId/:endId', (req, res) =>
  requestHandler(migrateManyPhotostories(parseInt(req.params.startId), parseInt(req.params.endId)), res)
);

app.use('/photostory/clean/single/:oldId/:newId', (req, res) =>
  requestHandler(cleanSinglePhotostoryMigration(parseInt(req.params.oldId), req.params.newId), res)
);

/**
 * Issue Migration Endpoints
 */
app.use('/issue/migrate/single/:issueId', (req, res) =>
  requestHandler(migrateSingleIssue(parseInt(req.params.issueId)), res)
);

/**
 * Company Migration Endpoints
 */
app.use('/company/migrate/all', (_req, res) => requestHandler(migrateAllCompanies(), res));
app.use('/company/migrate/single/:companyId', (req, res) =>
  requestHandler(migrateSingleCompany(req.params.companyId), res)
);
app.use('/company/migrate/many/:startId/:endId', (req, res) =>
  requestHandler(migrateManyCompanies(req.params.startId, req.params.endId), res)
);

/**
 * Server Endpoints
 */
app.use('/server/restart', (req, res) => requestHandler(reloadServer(), res));

app.use('/server/check', (req, res) => requestHandler(checkServer(), res));

// Catch All
app.use((req, res) =>
  res.status(404).json({
    status: 404,
    message: 'Requested page does not exist.',
    data: req.url,
  })
);

const server = app.listen(process.env.PORT ?? 8080, (error) => {
  if (error) return log.error(`Could not start server: `, error);
  return log.info(`Server started listening on 0.0.0.0:${process.env.PORT ?? 8080}`);
});

export default server;
