/**
 * @module app.schema.PollModel
 * @description Poll Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Poll Model
 * @constant PollSchema
 *
 * @type {mongoose.Schema}
 */
const PollSchema = new mongoose.Schema(
  {
    question: [
      {
        type: Object,
        required: true,
      },
    ],
    options: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    optionsCount: [
      {
        type: Number,
        required: true,
        min: 0,
      },
    ],
    totalVotes: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    expiry: {
      type: Date,
      required: true,
      min: new Date(Date.now()),
    },
    article: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: false,
      },
    ],
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
    collection: 'polls',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Poll Model
 * @constant PollModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Poll', PollSchema);
