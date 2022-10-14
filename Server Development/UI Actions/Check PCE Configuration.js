gs.include("IllumioConstants");
current.update();
var midGr = current.mid_server;
var mid_server = midGr.getDisplayValue();
var utils = new IllumioUtils();
if (utils.canStartJob(current, midGr)) {
    gs.addInfoMessage("You can track the process in scheduled job.");
    current.update();
    var startAuthentication = new IllumioStartAuthentication();
    startAuthentication.process();
}