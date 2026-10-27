sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (
    Controller
) {
    "use strict";

    return Controller.extend(
        "dashboardhub.dashboardhub.controller.View1",
        {
            onEmployeePress: function () {
                window.location.href =
                    "/employeed/webapp/index.html";
            },

            onManagerPress: function () {
                window.location.href =
                    "/manager/webapp/index.html";
            },

            onAdminPress: function () {
                window.location.href =
                    "/admin/webapp/index.html";
            }
        }
    );
});