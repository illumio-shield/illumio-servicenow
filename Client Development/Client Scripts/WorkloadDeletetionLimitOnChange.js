function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }
    var regex = new RegExp(/^[0-9]+%?$/);

    newValue = newValue.trim();
    if (newValue.match(regex)) {
        if (newValue.indexOf('%') >= 0) {
            var value = parseInt(newValue.split('%'));
            if (value > 100) {
                g_form.showFieldMsg('workload_deletion_limit', 'Invalid value. Please enter valid percentage between 0-100', 'error');
            }
        }
    } else {
        g_form.showFieldMsg('workload_deletion_limit', 'Invalid value. Please enter valid number or percentage', 'error');
    }
    //Type appropriate comment here, and begin script below

}