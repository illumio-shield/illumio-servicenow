function onNo() {

    if (GlideDialogWindow) {
        GlideDialogWindow.get().destroy();
    }
    g_form.setValue("number_of_workloads_to_be_created_from_servicenow", "");
    return false;
}
function onYes() {

    if (GlideDialogWindow) {
        GlideDialogWindow.get().destroy();
    }
    return false;
}