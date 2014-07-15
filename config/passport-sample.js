module.exports = {
    twitter: {
        consumerKey: process.env.TWITTER_KEY || 'your key',
        consumerSecret: process.env.TWITTER_SECRET  || 'your secret',
        callbackURL: '/auth/twitter/callback',
        passReqToCallback: true
    }
};
