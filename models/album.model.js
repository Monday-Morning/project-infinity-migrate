/**
 * @module app.schema.AlbumModel
 * @description Album Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Album Model
 * @constant AlbumSchema
 *
 * @type {mongoose.Schema}
 */
const AlbumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        reference: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tag',
          required: false,
        },
      },
    ],
    cover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      required: true,
    },
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
        required: true,
      },
    ],
    authors: [
      {
        name: {
          type: String,
          required: true,
        },
        details: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
    hits: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
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
    collection: 'albums',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Album Model
 * @constant AlbumModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Album', AlbumSchema);
