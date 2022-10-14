var IllumioAddToECCQueue = Class.create();
IllumioAddToECCQueue.prototype = {
    initialize: function(probe, midserver, parameters) {
        this.probe = probe; // probe name
        this.midServer = midserver; // mid server name
        this.parameters = parameters; // extra parameters to be passed
    },
    
    /**
     * Insert to ECC queue
     * @returns {boolean} true if the insert is successful else false
     */
    insert: function() {
        
        try {
            var ecc = new GlideRecord("ecc_queue");
            ecc.initialize();
            ecc.agent = 'mid.server.' + this.midServer;
            ecc.topic = 'JavascriptProbe';
            ecc.queue = 'output';
            ecc.state = 'ready';
            ecc.name = this.probe;
            
            var xmlstring = '<?xml version="1.0" encoding="UTF-8"?><parameters></parameters>';
            var xmldoc = new XMLDocument2();
            xmldoc.parseXML(xmlstring);
            
            // add skip sensors
            var el = xmldoc.createElement("parameter");
            el.setAttribute("name", "skip_sensor");
            el.setAttribute("value","true");
            
            // add probe name to be execute
            el = xmldoc.createElement("parameter");
            el.setAttribute("name", "probe_name");
            el.setAttribute("value",this.probe + 'Run');
            
            // add given parameters
            for(var param in this.parameters) {
                
                el = xmldoc.createElement("parameter");
                el.setAttribute("name", "glide.jms." + param);
                el.setAttribute("value", this.parameters[param]);
            }

            ecc.payload = xmldoc + "";
            
            // add it to the ECC queue
            ecc.insert();
            return true;
            
        } catch(exception) {
            
            gs.info('Exception occurred while adding to ECC queue. Exception: ' + exception);
            return false;
        }
        
    },
    
    type: 'IllumioAddToECCQueue'
};