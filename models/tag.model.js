/**
 * @module app.schema.TagModel
 * @description Tag Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Tag Model
 * @constant TagModel
 *
 * @type {mongoose.Schema}
 */
const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    adminColor: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      minLength: 6,
      maxLength: 6,
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
    collection: 'tags',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Tag Model
 * @constant TagModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Tag', TagSchema);
