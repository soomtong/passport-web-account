/**
 * Created by soomtong on 2014. 7. 3..
 */

exports.account = {
    haroo_id: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        reserved: {
            code: 1,
            msg: {
                en: "already exist haroo_id"
            }
        },
        available: {
            code: 0,
            msg: {
                en: "haroo_id not exist"
            }
        },
        success: {
            code: 5,
            msg: {
                en: "good to go"
            }
        },
        expired: {
            code: 4,
            msg: {
                en: "session expired"
            }
        },
        database: {
            code: 2,
            msg: {
                en: "database error"
            }
        }
    },
    token: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        allowed: {
            code: 0,
            msg: {
                en: "access allowed"
            }
        },
        denied: {
            code: 1,
            msg: {
                en: "access denied"
            }
        },
        no_exist: {
            code: 2,
            msg: {
                en: "no exist account"
            }
        }
    },
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
        validation_for_ext: {
            code: 4,
            msg: {
                en: "common validation error for external"
            }
        },
        no_exist: {
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
        no_exist: {
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
        no_exist: {
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
        token_expired: {
            code: 4,
            msg: {
                en: "invalid access token exist or token expired"
            }
        },
        no_exist: {
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
    password: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
        send_mail: {
            code: 0,
            msg: {
                en: "reset password mail sent"
            }
        },
        no_exist: {
            code: 2,
            msg: {
                en: "no exist account"
            }
        }
    },
    external: {
        validation: {
            code: 3,
            msg: {
                en: "common validation error"
            }
        },
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
