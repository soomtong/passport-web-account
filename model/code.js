/**
 * Created by soomtong on 2014. 7. 3..
 */

exports.account = {
    create: {
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
    },
    read: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        validationForExt: {
            code: 4,
            msg: {
                en: "common validation error for external"
            }
        },
        noExist: {
            code: 1,
            msg: {
                en: "no exist account"
            }
        },
        done: {
            code: 0,
            msg: {
                en: "account retrieved"
            }
        }
    },
    dismiss: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        noExist: {
            code: 1,
            msg: {
                en: "no exist account"
            }
        },
        done: {
            code: 0,
            msg: {
                en: "account dismissed"
            }
        }
    },
    update: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        database: {
            code: 2,
            msg: {
                en: "database error"
            }
        },
        noExist: {
            code: 1,
            msg: {
                en: "no exist account or password incorrect"
            }
        },
        done: {
            code: 0,
            msg: {
                en: "account updated"
            }
        }
    },
    remove: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        database: {
            code: 2,
            msg: {
                en: "database error"
            }
        },
        noExist: {
            code: 1,
            msg: {
                en: "no exist account or password incorrect"
            }
        },
        done: {
            code: 0,
            msg: {
                en: "account removed"
            }
        }
    },
    external: {
        link: {
            code: 0,
            msg: {
                en: "link process done"
            }
        },
        unlink: {
            code: 0,
            msg: {
                en: "unlink process done"
            }
        }
    }

};
