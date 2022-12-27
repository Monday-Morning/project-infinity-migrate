/**
 * @module app.schema.CompanyModel
 * @description Company Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Company Model
 * @constant CompanySchema
 *
 * @type {mongoose.Schema}
 */
const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    alias: [
      {
        type: String,
        required: false,
        trim: true,
      },
    ],
    location: {
      type: String,
      required: false,
      trim: true,
    },
    logo: {
      /** [0 - Adamantium Archive A, 1 - Adamantium Archive B, 2 - Active Store] */
      store: {
        type: Number,
        required: false,
        min: 0,
        max: 2,
      },
      storePath: {
        type: String,
        required: false,
      },
      blurhash: {
        type: String,
        required: false,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    schemaVersion: {
      type: Number,
      required: false,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    collection: 'companies',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Company Model
 * @constant CompanyModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Company', CompanySchema);
