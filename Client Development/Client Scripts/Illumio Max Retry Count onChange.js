function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }

    ScriptLoader.getScripts(['x_illu2_illumio.IllumioUIScript.jsdbx'], function() {
        x_illu2_illumio.IllumioUIScript.validateInt(oldValue, newValue, 'http_retry_count', 0, g_scratchpad.HTTP_RETRY_COUNT_MAX);
    });
}