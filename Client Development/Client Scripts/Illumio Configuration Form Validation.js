function onSubmit() {

    // username should not be blank
    var username = g_form.getValue('username').trim();
    g_form.setValue('username', username);

    // secret key should not be blank
    var secret = g_form.getValue('secret').trim();
    g_form.setValue('secret', secret);

    // PCE url should not be blank
    var url = g_form.getValue('pce_url').trim();
    g_form.setValue('pce_url', url);

    // organization id should not be blank
    var org = g_form.getValue('organization_id').trim();
    g_form.setValue('organization_id', org);

    var allowSubmit = true;

    // validate url regex
    if(!validateURL(url)) {
        g_form.hideFieldMsg('pce_url', true);
        g_form.showFieldMsg('pce_url', 'Invalid URL', 'error');
        allowSubmit = false;
    } else {
        g_form.hideFieldMsg('pce_url', true);
    }

    // validate organization id to be an integer
    if(!validateOrgId(org)) {
        g_form.hideFieldMsg('organization_id', true);
        g_form.showFieldMsg('organization_id', 'The organization ID must be a number.', 'error');
        allowSubmit = false;
    } else {
        g_form.hideFieldMsg('organization_id', true);
    }

    return allowSubmit;

}

function validateURL(str) {

    var pattern = /^(?:http(?:s)?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.(?:[-a-zA-Z0-9@:%._\+~#=]+)+(?:\:[0-9]+)?$/g;

    return str.match(pattern);        
}

function validateOrgId(str) {      

    return str.match(/^[0-9]*$/);        
} 