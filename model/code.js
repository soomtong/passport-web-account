/**
 * Created by soomtong on 2014. 7. 3..
 */

exports.account = {
    post: {
        validation: {
            code: 3,
                msg: {
                en: "common validation error"
            }
        },
        duplication: {
            code: 1,
                msg: {
                en: "already exist account"
            }
        },
        database: {
            code: 2,
                msg: {
                en: "database error"
            }
        },
        done: {
            code: 0,
                msg: {
                en: "account saved"
            }
        }
    }
};
