var IllumioPrepareWorkload = Class.create();
IllumioPrepareWorkload.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
    /**
     * Get list of labels' href by its key and value
     * @return {String} href.
     */
    getHrefs: function() {
        var retVal = []; // Return value       
        var labels = JSON.parse(this.getParameter('sysparm_labels_to_map'));
        var workload = JSON.parse(this.getParameter('sysparm_workload'));

        var labelsGr = new GlideRecord('x_illu2_illumio_illumio_pce_labels_mapping');

        for (var labelType in labels) {

            labelsGr.initialize();
            labelsGr.addQuery('key', labelType);
            labelsGr.addQuery('value', labels[labelType]);
            labelsGr.query();
            var found = false;
            while (labelsGr.next()) {
                var value = labelsGr.getValue('value');
                if (labels[labelType] && labels[labelType] == value) {
                    found = true;
                    retVal.push({
                        status: 'success',
                        href: labelsGr.getValue('href'),
                        key: labelType,
                        value: value
                    });
                }

            }
            if (!found) {
                retVal.push({
                    status: 'failed',
                    key: labelType,
                    value: labels[labelType]
                });
            }
        }
        var instanceURL = gs.getProperty('glide.servlet.uri');
        instanceURL = instanceURL.replace('https://', '');
        var result = {
            "workload": workload,
            "retVal": retVal,
            "instanceURL": instanceURL.replace('/', '')
        };
        return JSON.stringify(result);
    },

    /**
     * get the mapped fields from the configuration
     * @return {String} mapped fields.
     */
    getMappedFields: function() {
        var mappedFields = new IllumioGetPCEConfiguration().getMappedFields();
        return JSON.stringify(mappedFields);
    },

    type: 'IllumioPrepareWorkload'
});