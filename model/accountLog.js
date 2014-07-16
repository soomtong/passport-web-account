/**
 * Created by soomtong on 2014. 7. 3..
 */

var mongoose = require('mongoose');

var loggingSchema = new mongoose.Schema({
    email: { type: String, index: true, lowercase: true },
    createdAt: Date,
    updatedAt: Date,
    removedAt: Date,
    linkedAt: Date,
    unlinkedAt: Date,
    signedIn: Date,
    signedOut: Date
});

module.exports = mongoose.model('Log', loggingSchema);