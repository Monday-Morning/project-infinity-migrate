import { createConnection } from 'mysql';

import Logger from '../utils/winston.js';
const logger = new Logger('MySQL');

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

export default connection;
