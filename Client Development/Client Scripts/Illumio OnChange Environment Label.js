function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }

    // set value of hidden environment field to current value
    g_form.setValue('hide_environment',newValue);

}