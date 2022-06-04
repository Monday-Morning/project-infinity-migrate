/**
 * @module app.schema.SquiggleModel
 * @description Squiggle Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Squiggle Model
 * @constant SquiggleSchema
 *
 * @type {mongoose.Schema}
 */
const SquiggleSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
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
    collection: 'squiggles',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Squiggle Model
 * @constant SquiggleModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Squiggle', SquiggleSchema);
