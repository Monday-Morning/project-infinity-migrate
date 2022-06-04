/**
 * @module app.schema.CategoryMapModel
 * @description Category Map Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Category Map Model
 * @constant CategoryMapSchema
 *
 * @type {mongoose.Schema}
 */
const CategoryMapSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      min: 0,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parent: {
      number: {
        type: Number,
        required: false,
        min: 0,
      },
      reference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryMap',
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
    collection: 'categoryMaps',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Category Map Model
 * @constant CategoryMapModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('CategoryMap', CategoryMapSchema);
