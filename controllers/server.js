import pm2 from 'pm2';
import { connection as mongooseConnection } from '../config/mongoose.js';
import mysqlConnection from '../config/mysql.js';

export async function reloadServer() {
  return new Promise((resolve, reject) => {
    pm2.connect(function (err) {
      if (err) {
        return reject(err);
      }

      pm2.reload(0, function (err) {
        if (err) {
          return reject(err);
        }

        pm2.disconnect();
        return resolve('The server was reloaded');
      });
    });
  });
}

export async function checkServer() {
  if (!mongooseConnection || mongooseConnection.readyState !== 1) {
    return 'Mongoose connection is not ready';
  }
  if (mysqlConnection.state !== 'authenticated') {
    return 'MySQL connection is not ready';
  }
  return 'The server is ready';
}
