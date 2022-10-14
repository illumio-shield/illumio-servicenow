//Set up Package references
var httpclient = Packages.org.apache.commons.httpclient;
var stringRequestEntity = Packages.org.apache.commons.httpclient.methods.StringRequestEntity;
var httpProxy = Packages.org.apache.http;
var GetMethod = httpclient.methods.GetMethod;
var PutMethod = httpclient.methods.PutMethod;
var PostMethod = httpclient.methods.PostMethod;
var DeleteMethod = httpclient.methods.DeleteMethod;
var HttpClient = httpclient.HttpClient;
var client = new HttpClient();
var File = Packages.java.io.File;
var FileRequestEntity =  Packages.org.apache.commons.httpclient.methods.FileRequestEntity;
var retryHandler = Packages.org.apache.commons.httpclient.DefaultMethodRetryHandler;
var AuthScope = httpclient.auth.AuthScope;
var UsernamePasswordCredentials = httpclient.UsernamePasswordCredentials;
var Base64 = Packages.java.util.Base64;
