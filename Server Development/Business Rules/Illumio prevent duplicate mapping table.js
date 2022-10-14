(function executeRule(current, previous /*null when async*/ ) {

    // Add your code here
    var grPCEFieldMapping = new GlideRecord('x_illu2_illumio_illumio_pce_field_mapping');
    grPCEFieldMapping.addQuery('servicenow_source_table', current.servicenow_source_table);
    grPCEFieldMapping.addQuery('sys_id', '!=', current.sys_id);
    grPCEFieldMapping.query();
    if (grPCEFieldMapping.next()) {
        gs.addErrorMessage(current.servicenow_source_table + ' table is already selected in other field mapping. Please select the different table or update the existing field mapping.');
        gs.info('[Illumio prevent duplicate mapping table] ' + current.servicenow_source_table + ' table is already selected in other field mapping. Please select the different table or update the existing field mapping.');
        current.setAbortAction(true);
    }


})(current, previous);