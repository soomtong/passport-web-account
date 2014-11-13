/**
 * Created by soomtong on 2014. 7. 3..
 */

var mongoose = require('mongoose');

var loggingSchema = new mongoose.Schema({
    email: { type: String, index: true, lowercase: true },
    created_at: Date,
    updated_at: Date,
    removed_at: Date,
    linked_at: Date,
    unlinked_at: Date,
    signed_in: Date,
    signed_out: Date,
    check_token: Date
});

module.exports = mongoose.model('Log', loggingSchema);