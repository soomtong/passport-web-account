$(document).ready(function () {
    $('#form-signup-submit').on('click', function () {
        var $formWrapper = $('.form-wrapper');
        if (!$formWrapper.hasClass('hidden')) {
            $formWrapper.find('form').attr('action', '/signup');
            $formWrapper.find('form').submit();
        }
        toggleFormIntro('.form-wrapper', '.form-intro');
    });

    $('#signup-password').on('change paste keyup', document, function () {
        var associatedString = [];
        var name = $('#signup-nickname').val();
        var email = $('#signup-email').val();
        var password = $('#signup-password').val();

        if (name) associatedString.push(name);
        if (email) associatedString.push(email);

        updatePasswordStrength(passwordStrengthChecker(password, associatedString), $('.password-meter'));
    });

    $('#pop_login').on('click', function (e) {
        e.preventDefault();
        $('#modal_login').bPopup({
            opacity: 0.2
        });
        $('#login_email').focus();
    });

    $('#pop_social_login').on('click', function (e) {
        e.preventDefault();
        $('#modal_social_login').bPopup({
            opacity: 0.2
        });
    });

    $('#change_language').on('mouseover', function (e) {
        e.preventDefault();
        var $dropout = $('#change_language_dropout');
        var $changeLanguage = $('#change_language');
        var $icon = $changeLanguage.find('i.fa');

        $dropout.addClass('dropout-show');
        $icon.removeClass('hidden');
        $changeLanguage.addClass('pure-button-hover');
        $changeLanguage.one('click', function (e) {
            e.preventDefault();
            $dropout.removeClass('dropout-show');
            $icon.addClass('hidden');
            $changeLanguage.removeClass('pure-button-hover');
        });
    });
});

function updatePasswordStrength(str, el1) {
    var countDot = 4;
    var counter = Number(str);

    for (var idx = 0; idx < countDot; idx++) {
        var el2 = el1.children('.password-dot');
        if (idx >= counter) {
            el2.eq(countDot - idx - 1).css('background-color', '#cce6f9');  // safe gauge
        } else {
            el2.eq(countDot - idx - 1).css('background-color', '#27b30f');
        }
    }
}

function passwordStrengthChecker(password, combined) {
    if (!window.dropbox_strength_checker) {
        return 0;
    }
    var result = dropbox_strength_checker(password, combined);
    return result.score;
}

function toggleFormIntro(el1, el2) {
    if ($(el1).hasClass('hidden')) {
        $(el1).removeClass('hidden');
        $(el2).addClass('hidden');
        $(el1).find('#signup-email').focus();
    } else {
        $(el2).removeClass('hidden');
        $(el1).addClass('hidden');
    }
}
