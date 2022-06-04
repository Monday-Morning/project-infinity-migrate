/// Load environment configs
import 'dotenv/config';

// Import all modules
import express from 'express';
import './config/mongoose.js';
import './config/mysql.js';
import { migrateMany as migrateManyUsers, migrateSingle as migrateSingleUser } from './controllers/users.js';

// Load logger
import Winston from './utils/winston.js';
const log = new Winston('Main');

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
