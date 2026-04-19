/**
 * models/index.js — Single import point for all Mongoose models.
 *
 * Usage anywhere in the backend:
 *   const { User, Email, Session, ... } = require('../models');
 */

module.exports = {
  User:                require('./User'),
  Session:             require('./Session'),
  Email:               require('./Email'),
  CustomBucket:        require('./CustomBucket'),
  BucketRule:          require('./BucketRule'),
  UserPreferences:     require('./UserPreferences'),
  UserFeedback:        require('./UserFeedback'),
  AutoResponseRule:    require('./AutoResponseRule'),
  PendingAutoResponse: require('./PendingAutoResponse'),
  SafeDelete:          require('./SafeDelete'),
  IgnoredSender:       require('./IgnoredSender'),
};
