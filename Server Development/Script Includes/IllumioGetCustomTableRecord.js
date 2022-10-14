

var IllumioGetCustomTableRecord = Class.create();
IllumioGetCustomTableRecord.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {


    /**
     * Fetch the data from custom table and return to caller
     * @returns {String} Stringified object of the workload object
     */
    getData: function () {
        var retVal = []; // Return value       
        var mappedFields = new IllumioGetPCEConfiguration().getMappedFields();

        var sysIds = this.getParameter('sysparm_sys_ids').split(',');
        var utils = new x_illu2_illumio.IllumioUtils();
        var customTableGr = new GlideRecord('x_illu2_illumio_illumio_servicenow_servers');
        for (var i = 0, len = sysIds.length; i < len; i++) {
            customTableGr.initialize();
            customTableGr.addQuery('sys_id', sysIds[i]);
            customTableGr.addQuery('duplicate', false);
            customTableGr.query();
            if (customTableGr.next()) {
                try {
                    var interfacesObject = utils.getInterfacesObject(sysIds[i], mappedFields.fields);
                    retVal.push({
                        sys_id: sysIds[i],
                        status: 'success',
                        hostname: (customTableGr.hostname + "").trim(),
                        href: (customTableGr.pce_workload_href + "").trim(),
                        known_to_pce: (customTableGr.known_to_pce + "").trim(),

                        application: mappedFields.fields.application ? (customTableGr.select_application + "").trim() : (customTableGr.pce_application + "").trim(),
                        environment: mappedFields.fields.environment ? (customTableGr.select_environment + "").trim() : (customTableGr.pce_environment + "").trim(),
                        location: mappedFields.fields.location ? (customTableGr.select_location + "").trim() : (customTableGr.pce_location + "").trim(),
                        role: mappedFields.fields.role ? (customTableGr.select_role + "").trim() : (customTableGr.pce_role + "").trim(),
                        ip_address: (customTableGr.select_ip_address + "").trim(),
                        umw1: (customTableGr.select_ip_address_2 + "").trim(),
                        umw2: (customTableGr.select_ip_address_3 + "").trim(),
                        umw3: (customTableGr.select_ip_address_4 + "").trim(),
                        umw4: (customTableGr.select_ip_address_5 + "").trim(),
                        umw5: (customTableGr.select_ip_address_6 + "").trim(),

                        pce_application: (customTableGr.pce_application + "").trim(),
                        pce_environment: (customTableGr.pce_environment + "").trim(),
                        pce_location: (customTableGr.pce_location + "").trim(),
                        pce_role: (customTableGr.pce_role + "").trim(),
                        
                        interfaces: interfacesObject,
                        conflicts: customTableGr.conflicts + "",
                        duplicate: customTableGr.duplicate + ""
                    });
                } catch (err) {
                    gs.info("Err : " + err);
                }

            } else {
                retVal.push({
                    status: 'failed'
                });
            }

        }
        return JSON.stringify(retVal);
    },

    type: 'IllumioGetCustomTableRecord'
});