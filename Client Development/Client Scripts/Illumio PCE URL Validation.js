function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }

    // Take URL entered by user and validate
    var url = newValue.trim();

    if(!validateURL(url)) {
        g_form.showFieldMsg('pce_url', 'Invalid URL', 'error');
    } else {
        g_form.hideFieldMsg('pce_url', true);
    }
}

function validateURL(str) {

    var pattern = /^(?:http(?:s)?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%_\+~#=]+\.[-a-zA-Z0-9@%_\+~#=]+(?:\.[-a-zA-Z0-9@%_\+~#=]+)*(?:\:[0-9]+)?$/g;

    return str.match(pattern);

}