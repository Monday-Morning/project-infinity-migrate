import { connect, connection as _connection, Mongoose, Types } from 'mongoose';

import Logger from '../utils/logger';
const logger = new Logger('Mongoose');

export function init() {
  const MONGOOSE_OPTIONS = {
    maxPoolSize: 10,
    minPoolSize: 1,
  };
  connect(process.env.MONGO_URL, MONGOOSE_OPTIONS)
    .then(() => logger.info('Database Connected'))
    .catch((err) => logger.error('Could not connect to database: ', err));
}

export const connection = _connection.readyState !== 1 ? _connection : null;

export function isValidObjectId(id) {
  if (Types.ObjectId.isValid(id)) {
    if (String(new ObjectId(id)) === id) return true;
    return false;
  }
  return false;
}

export default Mongoose;
