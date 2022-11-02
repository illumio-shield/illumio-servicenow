function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }
	newValue = newValue.replaceAll(',','');
    var val = parseInt(newValue, 10);
    if (val < 0 || val > 600) {
        g_form.showFieldMsg('http_retry_interval_increment', 'Invalid value. Please enter valid value between 0-600', 'error');
    }
}