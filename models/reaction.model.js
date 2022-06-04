/**
 * @module app.schema.ReactionModel
 * @description Reaction Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Reaction Model
 * @constant ReactionSchema
 *
 * @type {mongoose.Schema}
 */
const ReactionSchema = new mongoose.Schema(
  {
    /** [0 - Like, 1 - Upvote] */
    type: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    // TODO: create redundancy if needed
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parent: {
      model: {
        type: String,
        required: true,
        enum: ['Article', 'Comment'],
      },
      reference: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'parent.model',
        required: true,
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
    collection: 'users',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Reaction Model
 * @constant ReactionModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Reaction', ReactionSchema);
