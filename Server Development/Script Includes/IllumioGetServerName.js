var IllumioGetServerName = Class.create();
IllumioGetServerName.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

    /**
     * To get server's display value
     * @return {String} server's display value.
     */
    getServerName: function() {
        var retVal = {};
        var sys_id = this.getParameter('sysparm_sys_id');
        var serverGr  = new GlideRecord('cmdb_ci_server');
        serverGr.addQuery('sys_id', sys_id);
        serverGr.query();

        if(serverGr.next()) {                                        
            retVal = {
                "sys_id" : serverGr.sys_id.getDisplayValue(), 
                "name" : serverGr.host_name.getDisplayValue()
            };
        }

        return JSON.stringify(retVal);
    },

    type: 'IllumioGetServerName'
});