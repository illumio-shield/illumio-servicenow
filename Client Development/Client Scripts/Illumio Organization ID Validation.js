function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }

    // Trim and test for valid regex for integer value
    var org = newValue.trim();

    if(!validateOrgId(org)) {
        g_form.showFieldMsg('organization_id', 'The organization ID must be a number.', 'error');
    } else {
        g_form.hideFieldMsg('organization_id', true);
    }
}

function validateOrgId(str) {      
    return str.match(/^[0-9]*$/);        
}