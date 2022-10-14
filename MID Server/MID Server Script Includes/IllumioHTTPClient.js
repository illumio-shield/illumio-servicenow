ms.include("IllumioHttpIncludes");
ms.include("IllumioMIDConstants");

var IllumioHTTPClient = Class.create();
IllumioHTTPClient.prototype = {
    initialize: function(baseUrl, username, password, protocol, pceMIDProxy) {
        this.logger = new IllumioLogUtil();
        this.baseUrl = baseUrl;
        var proxyFlag = (pceMIDProxy == "true" || pceMIDProxy == null) ? true : false;
        this.client = this._setupClient(baseUrl, username, password, protocol, proxyFlag);
    },

    /**
     * Setup the HTTP client
     * @param {string} baseUrl Base URL of the REST API
     * @param {string} username Username for the REST API
     * @param {string} password Password for the REST API
     * @param {string} protocol Protocol to use for the REST API
     * @param {boolean} proxyFlag Flag to indicate if the proxy should be used
     * @returns {HttpClient} HTTP client
     **/
    _setupClient: function(baseUrl, username, password, protocol, proxyFlag) {
        var client = new HttpClient();
        var authScope = new AuthScope(baseUrl, protocol);
        var credentials = new UsernamePasswordCredentials(username, password);
        client.getParams().setAuthenticationPreemptive(true);
        client.getState().setCredentials(authScope.ANY, credentials);
        var proxy = this._getProxy(proxyFlag);
        if (proxy != null) {
            client.getHostConfiguration().setProxy(proxy.host, proxy.port);
            client.getParams().setAuthenticationPreemptive(true);
            client.getState().setProxyCredentials(new AuthScope(proxy.host, proxy.port), new UsernamePasswordCredentials(proxy.username, proxy.password));
        }
        return client;
    },

    /**
     * Get the proxy details
     * @param {boolean} proxyFlag Flag to indicate if the proxy should be used
     * @returns {object} Proxy details
     **/
    _getProxy: function(proxyFlag) {
        var proxy = null;
        if (ms.getConfigParameter("mid.proxy.use_proxy") != "true") {
            this.logger._debug("Proxy is not configured, continuing with internet connection");
            return proxy;
        }
        if (proxyFlag) {
            var proxyHost = ms.getConfigParameter("mid.proxy.host");
            var proxyPort = ms.getConfigParameter("mid.proxy.port");
            var proxyUsername = ms.getConfigParameter("mid.proxy.username");
            var proxyPassword = ms.getConfigParameter("mid.proxy.password");
            proxy = {
                host: proxyHost,
                port: proxyPort,
                username: proxyUsername,
                password: proxyPassword
            };
        }
        return proxy;
    },

    /**
     * Execute the HTTP request
     * @param {String} endpoint Endpoint of the API
     * @param {String} queryString Query to add in the URL
     * @param {String} methodName Name of the method
     * @param {JSON} headers Object of headers to add to the request
     * @param {JSON} requestData Request body as JSON
     * @returns {JSON} Object of the response
     */
    _executeMethod: function(endpoint, queryString, method, headers, requestData) {

        if (queryString != "") {
            method.setQueryString(queryString);
        }

        if (headers) {
            for (var header in headers) {
                method.addRequestHeader(header, headers[header]);
            }
        }
        if (requestData) {

            method.setRequestBody(JSON.stringify(requestData));
            method.addRequestHeader('Content-Type', 'application/json');
        }
        try {
            this.client.executeMethod(method);
            var responseBody = method.getResponseBodyAsString();
            var responseCode = parseInt(method.getStatusCode());
            var getMethodResponseHeaders = method.getResponseHeaders();
            var responseHeaders = {};
            for (var i = 0, len = getMethodResponseHeaders.length; i < len; i++) {
                responseHeaders[getMethodResponseHeaders[i].getName()] = getMethodResponseHeaders[i].getValue();
            }

            // if response status is 200 ok or 202 for async request
            if (SUCCESS_CODES.indexOf(responseCode) != -1) {
                var responseObj = {
                    hasError: false,
                    data: new JSON().decode(responseBody),
                    headers: responseHeaders,
                    status: responseCode
                };

                return responseObj;
            } else {

                return {
                    hasError: true,
                    status: responseCode
                };
            }
        } catch (e) {
            this.logger._error("PCE request failed : Exception " + e);
            return {
                hasError: true,
                status: 0
            };
        }
    },

    /**
     * Execute and retry multiple times if the request fails
     * @param {String} endpoint Endpoint of the API
     * @param {String} queryString Query to add in the URL
     * @param {String} method Name of the method
     * @param {JSON} headers Object of headers to add to the request
     * @param {JSON} requestData Request body as JSON
     * @returns {JSON} Object of the response
     **/
    execute: function(endpoint, queryString, method, headers, requestData) {
        var retryCount = 0;
        var response = null;
        while (retryCount < 3) {
            response = this._executeMethod(endpoint, queryString, method, headers, requestData);
            if (!response.hasError) {
                return response;
            }
            retryCount++;
        }
        return response;
    },

    /**
     * Execute the GET call and retry multiple times if the request fails
     * @param {String} endpoint Endpoint of the API
     * @param {String} queryString Query to add in the URL
     * @param {JSON} headers Object of headers to add to the request
     * @param {JSON} requestData Request body as JSON
     * @returns {JSON} Object of the response
     **/
    get: function(endpoint, queryString, headers, requestData) {
        var retryCount = 0;
        var response = null;
        while (retryCount < MAX_RETRY_COUNTS) {
            var getMethod = new GetMethod(this.baseUrl + endpoint);
            this.logger._debug("APICALL: GET endpoint: " + endpoint + " queryString: " + queryString);
            response = this._executeMethod(endpoint, queryString, getMethod, headers, requestData);
            if (!response.hasError) {
                this.logger._debug("HTTP GET Call complete, status: " + response.status);
                return response;
            }
            this.logger._error("Failed: HTTP GET Call, status: " + response.status);
            retryCount++;
        }
        return response;
    },

    /**
     * Execute the POST call and retry multiple times if the request fails
     * @param {String} endpoint Endpoint of the API
     * @param {String} queryString Query to add in the URL
     * @param {JSON} headers Object of headers to add to the request
     * @param {JSON} requestData Request body as JSON
     * @returns {JSON} Object of the response
     **/
    post: function(endpoint, queryString, headers, requestData) {
        var retryCount = 0;
        var response = null;
        while (retryCount < MAX_RETRY_COUNTS) {
            var postMethod = new PostMethod(this.baseUrl + endpoint);
            this.logger._debug("APICALL: POST endpoint: " + endpoint + " queryString: " + queryString);
            response = this._executeMethod(endpoint, queryString, postMethod, headers, requestData);
            if (!response.hasError) {
                this.logger._debug("HTTP POST Call complete, status: " + response.status);
                return response;
            }
            this.logger._error("Failed: HTTP POST Call, status: " + response.status);
            retryCount++;
        }
        return response;

    },

    /**
     * Execute the PUT call and retry multiple times if the request fails
     * @param {String} endpoint Endpoint of the API
     * @param {String} queryString Query to add in the URL
     * @param {JSON} headers Object of headers to add to the request
     * @param {JSON} requestData Request body as JSON
     * @returns {JSON} Object of the response
     **/
    put: function(endpoint, queryString, headers, requestData) {
        var retryCount = 0;
        var response = null;
        while (retryCount < MAX_RETRY_COUNTS) {
            var putMethod = new PutMethod(this.baseUrl + endpoint);
            this.logger._debug("APICALL: PUT endpoint: " + endpoint + " queryString: " + queryString);
            response = this._executeMethod(endpoint, queryString, putMethod, headers, requestData);
            if (!response.hasError) {
                this.logger._debug("HTTP PUT Call complete, status: " + response.status);
                return response;
            }
            this.logger._error("Failed: HTTP PUT Call, status: " + response.status);
            retryCount++;
        }
        return response;
    },

    /**
     * Execute the DELETE call and retry multiple times if the request fails
     * @param {String} endpoint Endpoint of the API
     * @param {String} queryString Query to add in the URL
     * @param {JSON} headers Object of headers to add to the request
     * @param {JSON} requestData Request body as JSON
     * @returns {JSON} Object of the response
     **/
    deleteMethod: function(endpoint, queryString, headers, requestData) {
        var retryCount = 0;
        var response = null;
        while (retryCount < MAX_RETRY_COUNTS) {
            var method = new DeleteMethod(this.baseUrl + endpoint);
            this.logger._debug("APICALL: DELETE endpoint: " + endpoint + " queryString: " + queryString);
            response = this._executeMethod(endpoint, queryString, method, headers, requestData);
            if (!response.hasError) {
                this.logger._debug("HTTP DELETE Call complete, status: " + response.status);
                return response;
            }
            this.logger._error("Failed: HTTP DELETE Call, status: " + response.status);
            retryCount++;
        }
        return response;
    },

    /**
     * Get the value of the parameter from the config file
     * @param {string} parm parameters to get from config.xml
     * @returns Value of the parameter
     */
    getMidConfigParam: function(parm) {

        try {
            var m = Packages.com.service_now.mid.MIDServer.get();
            var config = m.getConfig();
            var result = config.getParameter(parm);
            var result_alternative = config.getProperty(parm);

            if (result) {
                return result;
            } else if (result_alternative) {
                return result_alternative;
            } else {
                config = Packages.com.service_now.mid.services.Config.get();
                result = config.getProperty(parm);
                return result;
            }
        } catch (error) {
            this.logger._except("Failed to load mid server configurations.");
            return null;
        }
    },

    type: "IllumioHTTPClient"
};
