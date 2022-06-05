import mongoose from 'mongoose';

import Logger from '../utils/winston.js';
const logger = new Logger('Mongoose');

const MONGOOSE_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 1,
};
mongoose
  .connect(process.env.MONGO_URL, MONGOOSE_OPTIONS)
  .then(() => logger.info('Database Connected'))
  .catch((err) => logger.error('Could not connect to database: ', err));

export const connection = mongoose.connection?.readyState !== 1 ? mongoose.connection : null;

export function isValidObjectId(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    if (String(new mongoose.Types.ObjectId(id)) === id) return true;
    return false;
  }
  return false;
}

export default mongoose.Mongoose;
