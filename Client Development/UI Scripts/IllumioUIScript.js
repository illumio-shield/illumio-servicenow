var x_illu2_illumio = x_illu2_illumio || {};

x_illu2_illumio.IllumioUIScript = (function() {
    "use strict";
    return {
        validateInt: function(oldValue, newValue, fieldName, minValue, maxValue) {
            newValue = newValue.replaceAll(',', '');
            var val = parseInt(newValue, 10);
            if (val < minValue || val > maxValue) {
                g_form.showFieldMsg(fieldName, 'Invalid value. Please enter valid value between ' + minValue + '-' + maxValue, 'error');
            }
        },
        type: "IllumioUIScript"
    };
})();