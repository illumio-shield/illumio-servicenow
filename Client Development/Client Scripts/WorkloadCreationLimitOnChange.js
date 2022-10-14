function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }

    //Type appropriate comment here, and begin script below
    var regex = new RegExp(/^[0-9]+%?$/);

    newValue = newValue.trim();
    if (newValue.match(regex)) {
        if (newValue.indexOf('%') >= 0) {
            var value = parseInt(newValue.split('%'));
            if (value > 100) {
                g_form.showFieldMsg('number_of_workloads_to_be_created_from_servicenow', 'Invalid value. Please enter valid percentage between 0-100', 'error');
            }
        }
    } else {
        g_form.showFieldMsg('number_of_workloads_to_be_created_from_servicenow', 'Invalid value. Please enter valid number or percentage', 'error');
    }
    if (newValue > 10000) {
        var dialog = new GlideDialogWindow("x_illu2_illumio_Workload_Creation_Confirmation");
        var message = "This will allow to create " + newValue + " workloads on PCE. Are you sure?";

        renderPopup(
            dialog,
            'Confirmation',
            message,
            submitForm.bind(this, dialog),
            hideDialog.bind(this, dialog)
        );
    }
    /**
     * Render a popup asking for confirmation. Print "message"
     * @param {String} message 
     */
    function renderPopup(dialog1, title, message1, onYes, onNo) {

        dialog1.setTitle(title);
        dialog1.setPreference('sysparm_message', message1);
        dialog1.setPreference('onNo', onNo /*hideDialog1.bind(this, dialog1)*/ );
        dialog1.setPreference('onYes', onYes /*submitForm.bind(this, dialog1)*/ );
        dialog1.render();
    }

}
/**
 * Hides the popup 
 * @param {object} dialog 
 */
function hideDialog(dialog) {

    try {
        dialog.setBackdropStatic(true);
    } catch (e) {
        jslog(e);
    }
}

/**
 * Destroys the popup and submits the form
 * @param {object} dialog 
 */
function submitForm(dialog) {

    try {
        dialog.setBackdropStatic(true);
    } catch (e) {
        jslog(e);
    }
    g_form.setValue("number_of_workloads_to_be_created_from_servicenow", "");
}