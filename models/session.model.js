/**
 * @module app.schema.SessionModel
 * @description Session Model
 *
 * @requires mongoose.Schema
 * @requires mongoose.model
 *
 * @version schema:v1
 * @since 0.1.0
 */

import mongoose from 'mongoose';

/**
 * @description The schema definition for Session Model
 * @constant SessionSchema
 *
 * @type {mongoose.Schema}
 */
const SessionSchema = new mongoose.Schema(
  {
    startTS: {
      type: Date,
      required: true,
    },
    endTS: {
      type: Date,
      required: false,
    },
    issues: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue',
      },
    ],
    team: [
      {
        /** [0 - Member, 1 - Coordinator, 2 - Mentor] */
        position: {
          type: Number,
          required: false,
          default: 0,
          min: 0,
          max: 2,
        },
        /** [0 - Content, 1 - Photography, 2 - Design, 3 - Technical] */
        team: {
          type: Number,
          required: false,
          min: 0,
          max: 3,
        },
        name: {
          type: String,
          required: false,
          trim: true,
        },
        picture: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Media',
          required: false,
        },
        reference: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: false,
        },
      },
    ],
    // TODO: create sub sections for static info based on design
    static: [
      {
        staticKey: {
          type: String,
          required: false,
          trim: true,
          unique: true,
        },
        staticValue: {
          type: String,
          required: false,
          trim: true,
        },
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
    collection: 'sessions',
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/**
 * @description Generated Session Model
 * @constant SessionModel
 *
 * @type {mongoose.Model}
 */
export default mongoose.model('Session', SessionSchema);
