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
} from './controllers/users.js';
import { migrate as migrateTags } from './controllers/tag.js';
import { migrate as migrateAdminTags } from './controllers/adminTag.js';
import { migrateMany as migrateManyArticles, migrateSingle as migrateSingleArticle } from './controllers/article.js';

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

app.use('/users/migrate/all', (req, res) => requestHandler(migrateAllUsers(), res));

app.use('/users/clean/single/:oldId/:newId', (req, res) =>
  requestHandler(cleanSingleUserMigration(parseInt(req.params.oldId), parseInt(req.params.newId)), res)
);

app.use('/users/clean/all', (req, res) => requestHandler(cleanAllUserMigrations(), res));

/**
 * Tag Migration Endpoints
 */
app.use('/tag/migrate/all', (req, res) => requestHandler(migrateTags(), res));

app.use('/adminTag/migrate/all', (req, res) => requestHandler(migrateAdminTags(), res));

/**
 * Article Migration Endpoints
 */
app.use('/article/migrate/single/:articleId', (req, res) =>
  requestHandler(migrateSingleArticle(parseInt(req.params.articleId)), res)
);

app.use('/article/migrate/many/:startId/:endId', (req, res) =>
  requestHandler(migrateManyArticles(parseInt(req.params.startId), parseInt(req.params.endId)), res)
);

// Catch All
app.use((req, res) =>
  res.status(404).json({
    status: 404,
    message: 'Requested page does not exist.',
    data: req.url,
  })
);

const server = app.listen(process.env.PORT || 8080, (error) => {
  if (error) return log.error(`Could not start server: `, error);
  return log.info(`Server started listening on 0.0.0.0:${process.env.PORT || 8080}`);
});

export default server;
