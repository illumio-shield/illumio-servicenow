gs.include("IllumioConstants");
var IllumioGetPCEConfiguration = Class.create();
IllumioGetPCEConfiguration.prototype = {
    initialize: function() {
    },

    /**
     * To get current PCE configuration stored in configuration table
     * @return {JSON} Object of configuration details.
     */
    getConfiguration: function() {

        var pceConfig = new GlideRecord('x_illu2_illumio_illumio_pce_conf');
        pceConfig.query();

        if (pceConfig.next()) {

            var fieldmapping = this.getFieldMapping();


            // considering single configuration will be stored in configurations table
            return {
                midServer: String(pceConfig.mid_server.name),
                pceUsername: pceConfig.username.getDecryptedValue(),
                pceSecret: pceConfig.secret_key.getDecryptedValue(),
                pceUrl: String(pceConfig.pce_url),
                pceOrganizationID: String(pceConfig.organization_id),
                source: fieldmapping,
                autoSync: pceConfig.auto_synchronization,
                create_workload_limit: pceConfig.new_workloads_to_create_at_a_time,
                enable_limit: pceConfig.limits_on_workloads_and_labels_changes_per_sync,
                limit_on_label_creation: pceConfig.set_limit_on_new_label_creation,
                label_creation_limit: pceConfig.new_label_creation_limit,
                limit_on_wl_modification: pceConfig.set_limit_on_workload_label_modifications,
                wl_modification_limit: pceConfig.workload_label_modifications_limit,
                limit_on_wl_creation: pceConfig.create_unmanaged_workloads_on_pce_from_cmdb_records,
                wl_creation_limit: pceConfig.number_of_workloads_to_be_created_from_servicenow,
                limit_on_wl_deletion: pceConfig.set_limit_on_workload_deletion,
                wl_deletion_limit: pceConfig.workload_deletion_limit,
                enable_pce_mid_proxy: pceConfig.enable_proxy_between_pce_and_mid_server,
                retry_params: {
                    http_retry_count: parseInt(pceConfig.getValue('http_retry_count')),
                    http_retry_interval_increment: parseInt(pceConfig.getValue('http_retry_interval_increment')),
                    http_retry_interval_max: parseInt(pceConfig.getValue('http_retry_interval_max'))
                }
            };

        } else {
            gs.warn("No configuration found.");
            return null;
        }

    },

    /**
     * get the field mapping labels from PCE field mapping table
     * @return {JSON} Object of field mapping labels.
     */
    getFieldMapping: function() {

        var fields = ['host_name', 'application', 'environment', 'role', 'location'];
        for(var i=0;i<MAX_IP_ADDRESSES;i++){
            var ipAddressName = (i > 0) ? 'ip_address_'+(i+1) : 'ip_address';
            fields.push(ipAddressName);
        }
        var result = {};
        var gr = new GlideRecord('x_illu2_illumio_illumio_pce_field_mapping');
        gr.query();

        if (gr.hasNext()) {
            while (gr.next()) {
                var labels = new Object();
                for (i = 0; i < fields.length; i++) {
                    if (!gs.nil(gr[fields[i]])) {
                        labels[fields[i]] = gr[fields[i]].getDisplayValue();
                    }
                }
                var conditionForRetiredWorkload = gr.getValue('conditions_for_retired_workloads');
                var sortOrder = gr['set_user_configurable_sort_order'] ? gr['order_by_column_name'].getDisplayValue() : gr['sys_updated_on'].getDisplayValue();
                var orderBy = gr['order'];
                var conditionForDeletingWorkload = gr.getValue('conditions_for_deleting_workloads');
                result[gr.servicenow_source_table] = {
                    labels: labels,
                    condition: conditionForRetiredWorkload,
                    delete_condition: conditionForDeletingWorkload,
                    sort_order: sortOrder,
                    order_by: orderBy
                };
            }
            return result;
        }
        return null;
    },

    /**
     * get list of fields which are mapped
     * @return {JSON} Object of field that are mapped.
     */
    getMappedFields: function() {
        var fields = ['application', 'environment', 'role', 'location'];
        var mappedFields = {
            'application': false,
            'environment': false,
            'role': false,
            'location': false,
        };
        for(var i=0;i< MAX_IP_ADDRESSES;i++){
            var ipAddressName = (i > 0) ? 'ip_address_'+(i+1) : 'ip_address';
            mappedFields[ipAddressName] = false;
            fields.push(ipAddressName);
        }
        var grMapping = new GlideRecord('x_illu2_illumio_illumio_pce_field_mapping');
        grMapping.query();
        while (grMapping.next()) {
            for (i = 0; i < fields.length; i++) {    
                if (!gs.nil(grMapping.getValue(fields[i]))) {
                    mappedFields[fields[i]] = true;
                }
            }
        }
        var updateFields = [];
        if (mappedFields.application) {
            updateFields.push('app');
        }
        if (mappedFields.location) {
            updateFields.push('loc');
        }
        if (mappedFields.environment) {
            updateFields.push('env');
        }
        if (mappedFields.role) {
            updateFields.push('role');
        }
        return {
            fields: mappedFields,
            updateFields: updateFields
        };
    },
    type: 'IllumioGetPCEConfiguration'
};