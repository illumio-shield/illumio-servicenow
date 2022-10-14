var IllumioUtilsAJAX = Class.create();
IllumioUtilsAJAX.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
    FIELD_NAME_TYPE: "field_name",

    /**
     * get field name type fields.
     * @return {String} fields with type field name.
     */
    getFieldNameTypeFields: function() {
        var eligibleFields = [];
        var mappingsGR = new GlideRecord("x_illu2_illumio_illumio_pce_field_mapping");
        mappingsGR.initialize();
        for (var field in mappingsGR) {
            if (field.startsWith("sys_") || field == "order_by_column_name")
                continue;
            try {
                if (mappingsGR.getElement(field).getED().getInternalType() == this.FIELD_NAME_TYPE)
                    eligibleFields.push(field);
            } catch (e) {
                gs.error("Exception while fetching fields: " + e);
            }

        }
        return JSON.stringify(eligibleFields);
    },

    type: 'IllumioUtilsAJAX'
});