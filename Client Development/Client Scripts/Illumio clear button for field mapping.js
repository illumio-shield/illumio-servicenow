function onLoad() {
    var utilsGA = new GlideAjax("IllumioUtilsAJAX");
    utilsGA.addParam("sysparm_name", "getFieldNameTypeFields");
    utilsGA.getXML(createClearButtons);

    function createClearButtons(response) {
        var inPutIdPref = "element.x_illu2_illumio_illumio_pce_field_mapping.";
        var fields = JSON.parse(response.responseXML.documentElement.getAttribute("answer"));
        
        for (var fInd = 0; fInd < fields.length; fInd++) {
            var fieldName = fields[fInd];
            var field = document.getElementById(inPutIdPref + fieldName);
            field = field.getElementsBySelector(".form-field-addons")[0];
            field.innerHTML += "<div><button style='margin-left:13px' onclick=\"g_form.clearValue('" + fieldName + "')\" type=\"button\" class=\"btn btn-default deleteButton\">Clear</button></div> ";
        }

    }

}