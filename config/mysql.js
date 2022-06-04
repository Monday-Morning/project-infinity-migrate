import { createConnection } from 'mysql';

import Logger from '../utils/logger';
const logger = new Logger('MySQL');

export function init() {
  const connection = createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
  });
  connection.connect((err) => {
    if (err) {
      logger.error('Connection Error: ', err.stack);
      return;
    }

    logger.info(`Connected: ${connection.threadId}`);
  });
  return connection;
}

export function performQuery(query) {
  return new Promise((resolve, reject) => {
    connection.query(query, (error, results, _) => {
      if (error) {
        reject(error);
      }
      resolve(results);
    });
  });
}
