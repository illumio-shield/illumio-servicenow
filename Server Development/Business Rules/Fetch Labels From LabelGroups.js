(function executeRule(current, previous /*null when async*/) {

    var pceConfig = new GlideRecord('x_illu2_illumio_illumio_pce_conf');
    pceConfig.query();
    if (pceConfig.next()) {
        var fetchLabels = new sn_ws.RESTMessageV2('IllumioFetchLabelFromLabelGroups', 'GetLabels');
        var pce_authorization = gs.base64Encode(pceConfig.username.getDecryptedValue() + ':' + pceConfig.secret_key.getDecryptedValue());
        
        fetchLabels.setRequestHeader('Authorization', 'Basic '+ pce_authorization);

        fetchLabels.setStringParameter('url', pceConfig.pce_url + '');
    
        fetchLabels.setStringParameter('href', current.getValue("href") + '');

        fetchLabels.setMIDServer(pceConfig.mid_server.name + '');

        fetchLabels.setEccParameter('skip_sensor', 'true');

    }
    try {
        //Execute REST message
        var response = fetchLabels.execute();
        var response_status = response.getStatusCode();

        //If Success, get token and throw an error otherwise
        if (response_status == 200 || response_status == 201) {
            response = JSON.parse(response.getBody());
            
            var grLabel = new GlideRecord('x_illu2_illumio_illumio_pce_labels_mapping');
            var grMember = new GlideRecord('x_illu2_illumio_label_group_member');
            
            for(var i = 0; i < response.labels.length; i++){
                var label = response.labels[i].href;
                grLabel.get('href', label);
                grMember.initialize();
                
                grMember.illumio_label_group = current.sys_id;
                grMember.insert();
            }

        }
            
    } catch (ex) {
        gs.error('[Illumio]Exception: '+ ex);

    }
    
    
})(current, previous);