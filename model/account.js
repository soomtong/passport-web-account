/**
 * Created by soomtong on 2014. 7. 3..
 */

var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');

var accountSchema = new mongoose.Schema({
    access_token: { type: String, unique: true, index: true },
    haroo_id: { type: String, unique: true, index: true },
    email: { type: String, unique: true, index: true, lowercase: true },
    password: String,
    db_host: String,
    login_expire: String,

    created_at: Date,
    updated_at: Date,

    from_web: String,
    facebook: String,
    twitter: String,
    google: String,
    github: String,
    instagram: String,
    linkedin: String,
    tokens: Array,

    profile: {
        name: { type: String, default: '' },
        gender: { type: String, default: '' },
        location: { type: String, default: '' },
        website: { type: String, default: '' },
        picture: { type: String, default: '' }
    },

    reset_password_token: String,
    reset_password_token_expire: Date
});

// hash password, executes before each user.save() call.
accountSchema.pre('save', function(next) {
    var user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(5, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, null, function(err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

// validate password for local strategy
accountSchema.methods.comparePassword = function(candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return callback(err);
        callback(null, isMatch);
    });
};

// get gravatar
accountSchema.methods.gravatar = function(size) {
    if (!size) size = 200;

    if (!this.email) {
        return 'https://gravatar.com/avatar/?s=' + size + '&d=retro';
    }

    var md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + '&d=retro';
};

module.exports = mongoose.model('Account', accountSchema);