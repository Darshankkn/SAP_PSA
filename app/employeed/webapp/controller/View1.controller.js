sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/DatePicker",
    "sap/m/Select",
    "sap/m/Input",
    "sap/m/CheckBox",
    "sap/m/Button",
    "sap/ui/core/Item"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Dialog,
    VBox,
    Label,
    DatePicker,
    Select,
    Input,
    CheckBox,
    Button,
    Item
) {
    "use strict";

    return Controller.extend("employeed.controller.View1", {
        onInit: function () {
            this._employeeID = "";
            this._employeeSelectionDialog = null;
            this._employeeSelectorOpening = false;

            var oDashboardModel = new JSONModel({
                employeeID: "",
                employeeName: "",

                draftCount: 0,
                submittedCount: 0,
                approvedCount: 0,
                rejectedCount: 0,

                totalLoggedHours: 0,
                totalBillableHours: 0,

                timesheets: [],
                tasks: [],

                selectedTimesheet:
                    this._emptySelectedTimesheet(),

                showEntriesPanel: false
            });

            oDashboardModel.setSizeLimit(1000);

            this.getView().setModel(
                oDashboardModel,
                "employeeDashboard"
            );

            /*
             * Open the Employee selector once after the
             * Dashboard model has been initialized.
             *
             * Do not add an onAfterShow event delegate here.
             * Having both onAfterShow and setTimeout causes
             * the selector to open twice.
             */
            setTimeout(
                function () {
                    if (
                        !this._getEmployeeID() &&
                        !this._employeeSelectorOpening &&
                        !this._employeeSelectionDialog
                    ) {
                        this._openEmployeeSelectionDialog();
                    }
                }.bind(this),
                0
            );
        },

        /* ========================================================== */
        /* EMPLOYEE SELECTION                                        */
        /* ========================================================== */

        _getEmployeeID: function () {
            return this._employeeID || "";
        },

        _setEmployeeID: function (
            sEmployeeID
        ) {
            this._employeeID =
                sEmployeeID || "";

            var oDashboardModel =
                this.getView().getModel(
                    "employeeDashboard"
                );

            if (oDashboardModel) {
                oDashboardModel.setProperty(
                    "/employeeID",
                    this._employeeID
                );
            }
        },

        _loadEmployeeOptions:
            async function () {
                var oODataModel =
                    this.getOwnerComponent()
                        .getModel();

                if (!oODataModel) {
                    throw new Error(
                        "OData model is unavailable."
                    );
                }

                var aEmployees =
                    await this._requestObjects(
                        oODataModel,
                        "/Employees"
                    );

                return aEmployees
                    .filter(
                        function (oEmployee) {
                            return (
                                !oEmployee.status ||
                                oEmployee.status ===
                                    "Active"
                            );
                        }
                    )
                    .map(
                        function (oEmployee) {
                            return {
                                ID:
                                    oEmployee.ID,

                                employeeName:
                                    [
                                        oEmployee.firstName,
                                        oEmployee.lastName
                                    ]
                                        .filter(Boolean)
                                        .join(" ") ||
                                    oEmployee.email ||
                                    oEmployee.ID,

                                email:
                                    oEmployee.email || ""
                            };
                        }
                    )
                    .sort(
                        function (
                            oFirst,
                            oSecond
                        ) {
                            return String(
                                oFirst.employeeName
                            ).localeCompare(
                                String(
                                    oSecond.employeeName
                                )
                            );
                        }
                    );
            },

        _openEmployeeSelectionDialog:
            async function () {
                /*
                 * Set the lock before requesting Employees.
                 * This prevents simultaneous calls from
                 * creating multiple dialogs.
                 */
                if (
                    this._employeeSelectorOpening
                ) {
                    return;
                }

                if (
                    this._employeeSelectionDialog
                ) {
                    return;
                }

                this._employeeSelectorOpening =
                    true;

                var oView =
                    this.getView();

                try {
                    oView.setBusy(true);

                    var aEmployees =
                        await this
                            ._loadEmployeeOptions();

                    if (!aEmployees.length) {
                        MessageBox.warning(
                            "No active Employees are available."
                        );

                        return;
                    }

                    /*
                     * The Employee may have been selected while
                     * the Employee request was completing.
                     */
                    if (
                        this._getEmployeeID()
                    ) {
                        return;
                    }

                    var oEmployeeSelect =
                        new Select({
                            width: "100%"
                        });

                    oEmployeeSelect.addItem(
                        new Item({
                            key: "",
                            text:
                                "Select Employee"
                        })
                    );

                    aEmployees.forEach(
                        function (oEmployee) {
                            var sText =
                                oEmployee.employeeName;

                            if (oEmployee.email) {
                                sText +=
                                    " (" +
                                    oEmployee.email +
                                    ")";
                            }

                            oEmployeeSelect.addItem(
                                new Item({
                                    key:
                                        oEmployee.ID,

                                    text:
                                        sText
                                })
                            );
                        }
                    );

                    var oDialog =
                        new Dialog({
                            title:
                                "Select Employee",

                            contentWidth:
                                "32rem",

                            busyIndicatorDelay:
                                0,

                            content: [
                                new VBox({
                                    items: [
                                        new Label({
                                            text:
                                                "Employee",

                                            required:
                                                true,

                                            labelFor:
                                                oEmployeeSelect
                                        }),

                                        oEmployeeSelect
                                    ]
                                }).addStyleClass(
                                    "sapUiSmallMargin"
                                )
                            ],

                            beginButton:
                                new Button({
                                    text:
                                        "Open Dashboard",

                                    type:
                                        "Emphasized",

                                    press:
                                        async function () {
                                            var sEmployeeID =
                                                oEmployeeSelect
                                                    .getSelectedKey();

                                            if (!sEmployeeID) {
                                                MessageBox.warning(
                                                    "Select an Employee."
                                                );

                                                return;
                                            }

                                            var oOpenButton =
                                                oDialog
                                                    .getBeginButton();

                                            try {
                                                oDialog.setBusy(
                                                    true
                                                );

                                                oOpenButton.setEnabled(
                                                    false
                                                );

                                                this._setEmployeeID(
                                                    sEmployeeID
                                                );

                                                await this
                                                    ._loadEmployeeDashboard();

                                                oDialog.close();

                                            } catch (oError) {
                                                this._setEmployeeID(
                                                    ""
                                                );

                                                MessageBox.error(
                                                    this._getErrorMessage(
                                                        oError,
                                                        "Employee Dashboard could not be opened."
                                                    )
                                                );

                                            } finally {
                                                oDialog.setBusy(
                                                    false
                                                );

                                                oOpenButton.setEnabled(
                                                    true
                                                );
                                            }
                                        }.bind(this)
                                }),

                            afterClose:
                                function () {
                                    if (
                                        this
                                            ._employeeSelectionDialog ===
                                        oDialog
                                    ) {
                                        this._employeeSelectionDialog =
                                            null;
                                    }

                                    oDialog.destroy();
                                }.bind(this)
                        });

                    this._employeeSelectionDialog =
                        oDialog;

                    oView.addDependent(
                        oDialog
                    );

                    oDialog.open();

                } catch (oError) {
                    MessageBox.error(
                        this._getErrorMessage(
                            oError,
                            "Employees could not be loaded."
                        )
                    );

                } finally {
                    this._employeeSelectorOpening =
                        false;

                    oView.setBusy(false);
                }
            },

        onChangeEmployee: function () {
            if (
                this._employeeSelectorOpening ||
                this._employeeSelectionDialog
            ) {
                return;
            }

            this._setEmployeeID("");

            var oDashboardModel =
                this.getView().getModel(
                    "employeeDashboard"
                );

            oDashboardModel.setData({
                employeeID: "",
                employeeName: "",

                draftCount: 0,
                submittedCount: 0,
                approvedCount: 0,
                rejectedCount: 0,

                totalLoggedHours: 0,
                totalBillableHours: 0,

                timesheets: [],
                tasks: [],

                selectedTimesheet:
                    this._emptySelectedTimesheet(),

                showEntriesPanel: false
            });

            var oTimesheetsTable =
                this.byId(
                    "timesheetsTable"
                );

            if (oTimesheetsTable) {
                oTimesheetsTable.removeSelections(
                    true
                );
            }

            this._openEmployeeSelectionDialog();
        },

        /* ========================================================== */
        /* GENERAL HELPERS                                            */
        /* ========================================================== */

        _toNumber: function (vValue) {
            var nValue =
                Number(vValue);

            return Number.isFinite(nValue)
                ? nValue
                : 0;
        },

        _getStatusState: function (
            sStatus
        ) {
            switch (sStatus) {
                case "Approved":
                case "Invoiced":
                    return "Success";

                case "Submitted":
                    return "Warning";

                case "Rejected":
                    return "Error";

                default:
                    return "None";
            }
        },

        _getErrorMessage: function (
            oError,
            sFallback
        ) {
            var sMessage =
                oError &&
                oError.message;

            try {
                var sResponseText =
                    oError &&
                    oError.cause &&
                    oError.cause.error &&
                    oError.cause.error
                        .responseText;

                var oResponse =
                    JSON.parse(
                        sResponseText
                    );

                if (
                    oResponse &&
                    oResponse.error &&
                    oResponse.error.message
                ) {
                    sMessage =
                        typeof oResponse
                            .error.message ===
                            "string"
                            ? oResponse.error.message
                            : oResponse.error.message
                                .value;
                }
            } catch (oIgnoredError) {
                // Retain the original error message.
            }

            return (
                sMessage ||
                sFallback
            );
        },

        _emptySelectedTimesheet:
            function () {
                return {
                    ID: "",
                    weekStartDate: "",
                    weekEndDate: "",
                    totalHours: 0,
                    totalBillableHours: 0,
                    status: "",
                    statusState: "None",
                    submittedDate: "",
                    approvedDate: "",
                    rejectionReason: "",
                    canEdit: false,
                    canSubmit: false,
                    entries: []
                };
            },

        _removeEmployeePrefix:
            function (sTaskName) {
                return String(
                    sTaskName || ""
                ).replace(
                    /^\[[0-9a-fA-F-]{36}\]\s*/,
                    ""
                );
            },

        _isTaskAssignedToEmployee:
            function (
                oTask,
                sEmployeeID
            ) {
                var sTaskName =
                    String(
                        oTask.taskName || ""
                    );

                var sPrefix =
                    "[" +
                    sEmployeeID +
                    "]";

                return (
                    sTaskName.indexOf(
                        sPrefix
                    ) === 0
                );
            },

        /* ========================================================== */
        /* ODATA HELPERS                                              */
        /* ========================================================== */

        _requestObjects: async function (
            oODataModel,
            sPath
        ) {
            var oListBinding =
                oODataModel.bindList(
                    sPath
                );

            var aContexts =
                await oListBinding
                    .requestContexts(
                        0,
                        1000
                    );

            return aContexts.map(
                function (oContext) {
                    return oContext
                        .getObject();
                }
            );
        },

        _executeUnboundAction:
            async function (
                sActionName,
                mParameters
            ) {
                var oODataModel =
                    this.getOwnerComponent()
                        .getModel();

                if (!oODataModel) {
                    throw new Error(
                        "OData model is unavailable."
                    );
                }

                var oActionBinding =
                    oODataModel.bindContext(
                        "/" +
                        sActionName +
                        "(...)"
                    );

                Object.keys(
                    mParameters || {}
                ).forEach(
                    function (
                        sParameterName
                    ) {
                        oActionBinding
                            .setParameter(
                                sParameterName,
                                mParameters[
                                    sParameterName
                                ]
                            );
                    }
                );

                await oActionBinding.execute();

                return oActionBinding
                    .getBoundContext();
            },

        _executeBoundAction:
            async function (
                sEntitySet,
                sRecordID,
                sActionName
            ) {
                var oODataModel =
                    this.getOwnerComponent()
                        .getModel();

                if (!oODataModel) {
                    throw new Error(
                        "OData model is unavailable."
                    );
                }

                if (!sRecordID) {
                    throw new Error(
                        "Record ID is required."
                    );
                }

                var sActionPath =
                    "/" +
                    sEntitySet +
                    "(" +
                    sRecordID +
                    ")/CatalogService." +
                    sActionName +
                    "(...)";

                var oActionBinding =
                    oODataModel.bindContext(
                        sActionPath
                    );

                await oActionBinding.execute();

                return oActionBinding
                    .getBoundContext();
            },

        /* ========================================================== */
        /* DASHBOARD LOAD                                             */
        /* ========================================================== */

        _loadEmployeeDashboard:
            async function () {
                var oView =
                    this.getView();

                var oDashboardModel =
                    oView.getModel(
                        "employeeDashboard"
                    );

                var sEmployeeID =
                    this._getEmployeeID();

                if (!sEmployeeID) {
                    this._openEmployeeSelectionDialog();
                    return;
                }

                oView.setBusy(true);

                try {
                    var oODataModel =
                        this.getOwnerComponent()
                            .getModel();

                    if (!oODataModel) {
                        throw new Error(
                            "OData model is unavailable."
                        );
                    }

                    var aResults =
                        await Promise.all([
                            this._requestObjects(
                                oODataModel,
                                "/Employees"
                            ),

                            this._requestObjects(
                                oODataModel,
                                "/Timesheets"
                            ),

                            this._requestObjects(
                                oODataModel,
                                "/TimesheetEntries"
                            ),

                            this._requestObjects(
                                oODataModel,
                                "/Tasks"
                            )
                        ]);

                    var aEmployees =
                        aResults[0];

                    var aTimesheets =
                        aResults[1];

                    var aEntries =
                        aResults[2];

                    var aTasks =
                        aResults[3];

                    var oEmployee =
                        aEmployees.find(
                            function (oItem) {
                                return (
                                    oItem.ID ===
                                    sEmployeeID
                                );
                            }
                        );

                    if (!oEmployee) {
                        throw new Error(
                            "Selected Employee was not found."
                        );
                    }

                    var sEmployeeName =
                        [
                            oEmployee.firstName,
                            oEmployee.lastName
                        ]
                            .filter(Boolean)
                            .join(" ");

                    var mTasks =
                        new Map();

                    aTasks.forEach(
                        function (oTask) {
                            mTasks.set(
                                oTask.ID,
                                oTask
                            );
                        }
                    );

                    var aTaskOptions =
                        aTasks
                            .filter(
                                function (oTask) {
                                    return (
                                        this
                                            ._isTaskAssignedToEmployee(
                                                oTask,
                                                sEmployeeID
                                            ) &&
                                        oTask.status !==
                                            "Completed" &&
                                        oTask.status !==
                                            "Done"
                                    );
                                }.bind(this)
                            )
                            .map(
                                function (oTask) {
                                    return {
                                        ID:
                                            oTask.ID,

                                        taskName:
                                            this
                                                ._removeEmployeePrefix(
                                                    oTask.taskName
                                                ) ||
                                            oTask.ID,

                                        status:
                                            oTask.status ||
                                            ""
                                    };
                                }.bind(this)
                            )
                            .sort(
                                function (
                                    oFirst,
                                    oSecond
                                ) {
                                    return String(
                                        oFirst.taskName
                                    ).localeCompare(
                                        String(
                                            oSecond.taskName
                                        )
                                    );
                                }
                            );

                    var aEmployeeTimesheets =
                        aTimesheets
                            .filter(
                                function (
                                    oTimesheet
                                ) {
                                    return (
                                        oTimesheet
                                            .employee_ID ===
                                        sEmployeeID
                                    );
                                }
                            )
                            .map(
                                function (
                                    oTimesheet
                                ) {
                                    var sStatus =
                                        oTimesheet.status ||
                                        "Draft";

                                    var aTimesheetEntries =
                                        aEntries
                                            .filter(
                                                function (
                                                    oEntry
                                                ) {
                                                    return (
                                                        oEntry
                                                            .timesheet_ID ===
                                                        oTimesheet.ID
                                                    );
                                                }
                                            )
                                            .map(
                                                function (
                                                    oEntry
                                                ) {
                                                    var oTask =
                                                        mTasks.get(
                                                            oEntry.task_ID
                                                        ) || {};

                                                    return {
                                                        ID:
                                                            oEntry.ID,

                                                        taskID:
                                                            oEntry.task_ID,

                                                        taskName:
                                                            this
                                                                ._removeEmployeePrefix(
                                                                    oTask
                                                                        .taskName
                                                                ) ||
                                                            "Task",

                                                        workDate:
                                                            oEntry.workDate ||
                                                            "",

                                                        hours:
                                                            this._toNumber(
                                                                oEntry.hours
                                                            ),

                                                        billable:
                                                            oEntry.billable ===
                                                            true
                                                    };
                                                }.bind(this)
                                            );

                                    var nTotalHours =
                                        aTimesheetEntries.reduce(
                                            function (
                                                nTotal,
                                                oEntry
                                            ) {
                                                return (
                                                    nTotal +
                                                    Number(
                                                        oEntry.hours ||
                                                        0
                                                    )
                                                );
                                            },
                                            0
                                        );

                                    var nBillableHours =
                                        aTimesheetEntries
                                            .filter(
                                                function (
                                                    oEntry
                                                ) {
                                                    return (
                                                        oEntry.billable ===
                                                        true
                                                    );
                                                }
                                            )
                                            .reduce(
                                                function (
                                                    nTotal,
                                                    oEntry
                                                ) {
                                                    return (
                                                        nTotal +
                                                        Number(
                                                            oEntry.hours ||
                                                            0
                                                        )
                                                    );
                                                },
                                                0
                                            );

                                    var bCanEdit =
                                        sStatus === "Draft" ||
                                        sStatus === "Rejected";

                                    return {
                                        ID:
                                            oTimesheet.ID,

                                        weekStartDate:
                                            oTimesheet.weekStartDate ||
                                            "",

                                        weekEndDate:
                                            oTimesheet.weekEndDate ||
                                            "",

                                        totalHours:
                                            Number(
                                                nTotalHours.toFixed(
                                                    2
                                                )
                                            ),

                                        totalBillableHours:
                                            Number(
                                                nBillableHours.toFixed(
                                                    2
                                                )
                                            ),

                                        status:
                                            sStatus,

                                        statusState:
                                            this._getStatusState(
                                                sStatus
                                            ),

                                        submittedDate:
                                            oTimesheet.submittedDate ||
                                            "",

                                        approvedDate:
                                            oTimesheet.approvedDate ||
                                            "",

                                        rejectionReason:
                                            oTimesheet.rejectionReason ||
                                            "",

                                        canEdit:
                                            bCanEdit,

                                        canSubmit:
                                            bCanEdit &&
                                            aTimesheetEntries.length >
                                                0,

                                        entries:
                                            aTimesheetEntries
                                    };
                                }.bind(this)
                            )
                            .sort(
                                function (
                                    oFirst,
                                    oSecond
                                ) {
                                    return String(
                                        oSecond.weekStartDate
                                    ).localeCompare(
                                        String(
                                            oFirst.weekStartDate
                                        )
                                    );
                                }
                            );

                    var oPreviousSelection =
                        oDashboardModel.getProperty(
                            "/selectedTimesheet"
                        );

                    var oSelectedTimesheet =
                        null;

                    if (
                        oPreviousSelection &&
                        oPreviousSelection.ID
                    ) {
                        oSelectedTimesheet =
                            aEmployeeTimesheets.find(
                                function (
                                    oTimesheet
                                ) {
                                    return (
                                        oTimesheet.ID ===
                                        oPreviousSelection.ID
                                    );
                                }
                            ) || null;
                    }

                    var nTotalLoggedHours =
                        aEmployeeTimesheets.reduce(
                            function (
                                nTotal,
                                oTimesheet
                            ) {
                                return (
                                    nTotal +
                                    oTimesheet.totalHours
                                );
                            },
                            0
                        );

                    var nTotalBillableHours =
                        aEmployeeTimesheets.reduce(
                            function (
                                nTotal,
                                oTimesheet
                            ) {
                                return (
                                    nTotal +
                                    oTimesheet
                                        .totalBillableHours
                                );
                            },
                            0
                        );

                    oDashboardModel.setData({
                        employeeID:
                            sEmployeeID,

                        employeeName:
                            sEmployeeName ||
                            oEmployee.email ||
                            "Employee",

                        draftCount:
                            aEmployeeTimesheets.filter(
                                function (
                                    oTimesheet
                                ) {
                                    return (
                                        oTimesheet.status ===
                                        "Draft"
                                    );
                                }
                            ).length,

                        submittedCount:
                            aEmployeeTimesheets.filter(
                                function (
                                    oTimesheet
                                ) {
                                    return (
                                        oTimesheet.status ===
                                        "Submitted"
                                    );
                                }
                            ).length,

                        approvedCount:
                            aEmployeeTimesheets.filter(
                                function (
                                    oTimesheet
                                ) {
                                    return (
                                        oTimesheet.status ===
                                        "Approved"
                                    );
                                }
                            ).length,

                        rejectedCount:
                            aEmployeeTimesheets.filter(
                                function (
                                    oTimesheet
                                ) {
                                    return (
                                        oTimesheet.status ===
                                        "Rejected"
                                    );
                                }
                            ).length,

                        totalLoggedHours:
                            Number(
                                nTotalLoggedHours.toFixed(
                                    2
                                )
                            ),

                        totalBillableHours:
                            Number(
                                nTotalBillableHours.toFixed(
                                    2
                                )
                            ),

                        timesheets:
                            aEmployeeTimesheets,

                        tasks:
                            aTaskOptions,

                        selectedTimesheet:
                            oSelectedTimesheet ||
                            this._emptySelectedTimesheet(),

                        showEntriesPanel:
                            Boolean(
                                oSelectedTimesheet
                            )
                    });

                } catch (oError) {
                    console.error(
                        "Employee Dashboard loading failed:",
                        oError
                    );

                    MessageBox.error(
                        this._getErrorMessage(
                            oError,
                            "Employee Dashboard data could not be loaded."
                        )
                    );

                } finally {
                    oView.setBusy(false);
                }
            },

        /* ========================================================== */
        /* TIMESHEET SELECTION                                       */
        /* ========================================================== */

        onTimesheetSelect:
            function (oEvent) {
                var oListItem =
                    oEvent.getParameter(
                        "listItem"
                    );

                if (!oListItem) {
                    return;
                }

                var oContext =
                    oListItem.getBindingContext(
                        "employeeDashboard"
                    );

                if (!oContext) {
                    return;
                }

                var oDashboardModel =
                    this.getView().getModel(
                        "employeeDashboard"
                    );

                oDashboardModel.setProperty(
                    "/selectedTimesheet",
                    oContext.getObject()
                );

                oDashboardModel.setProperty(
                    "/showEntriesPanel",
                    true
                );
            },

        onCloseEntries: function () {
            var oDashboardModel =
                this.getView().getModel(
                    "employeeDashboard"
                );

            oDashboardModel.setProperty(
                "/selectedTimesheet",
                this._emptySelectedTimesheet()
            );

            oDashboardModel.setProperty(
                "/showEntriesPanel",
                false
            );

            var oTable =
                this.byId(
                    "timesheetsTable"
                );

            if (oTable) {
                oTable.removeSelections(
                    true
                );
            }
        },

        onEditTimesheetFromRow: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("employeeDashboard");
            if (!oContext) {
                return;
            }

            var oTimesheet = oContext.getObject();
            var oDashboardModel = this.getView().getModel("employeeDashboard");
            oDashboardModel.setProperty("/selectedTimesheet", oTimesheet);
            oDashboardModel.setProperty("/showEntriesPanel", true);

            var oTable = this.byId("timesheetsTable");
            if (oTable) {
                var oListItem = oButton.getParent().getParent();
                if (oListItem && oListItem.setSelected) {
                    oTable.setSelectedItem(oListItem, true);
                }
            }

            if (oTimesheet.canEdit) {
                MessageToast.show("Timesheet opened for editing. You can edit dates and manage entries below.");
            } else {
                MessageToast.show("Viewing Timesheet entries.");
            }
        },

        onEditTimesheetDates: function () {
            var oDashboardModel = this.getView().getModel("employeeDashboard");
            var oTimesheet = oDashboardModel.getProperty("/selectedTimesheet");

            if (!oTimesheet || !oTimesheet.ID) {
                MessageBox.warning("Select a Timesheet first.");
                return;
            }

            if (!oTimesheet.canEdit) {
                MessageBox.warning("Only Draft or Rejected Timesheets can be edited.");
                return;
            }

            var oStartDate = new DatePicker({
                width: "100%",
                value: oTimesheet.weekStartDate,
                valueFormat: "yyyy-MM-dd",
                displayFormat: "yyyy-MM-dd"
            });

            var oEndDate = new DatePicker({
                width: "100%",
                value: oTimesheet.weekEndDate,
                valueFormat: "yyyy-MM-dd",
                displayFormat: "yyyy-MM-dd"
            });

            var oDialog = new Dialog({
                title: "Edit Timesheet Week Dates",
                contentWidth: "30rem",
                content: [
                    new VBox({
                        items: [
                            new Label({
                                text: "Week Start",
                                required: true,
                                labelFor: oStartDate
                            }),
                            oStartDate,
                            new Label({
                                text: "Week End",
                                required: true,
                                labelFor: oEndDate
                            }).addStyleClass("sapUiSmallMarginTop"),
                            oEndDate
                        ]
                    }).addStyleClass("sapUiSmallMargin")
                ],
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: async function () {
                        var sStartDate = oStartDate.getValue();
                        var sEndDate = oEndDate.getValue();

                        if (!sStartDate || !sEndDate) {
                            MessageBox.warning("Week Start and Week End are mandatory.");
                            return;
                        }

                        if (sEndDate < sStartDate) {
                            MessageBox.warning("Week End cannot be before Week Start.");
                            return;
                        }

                        try {
                            oDialog.setBusy(true);

                            await this._executeUnboundAction("updateTimesheet", {
                                ID: oTimesheet.ID,
                                weekStartDate: sStartDate,
                                weekEndDate: sEndDate
                            });

                            MessageToast.show("Timesheet dates updated successfully.");
                            oDialog.close();

                            await this._loadEmployeeDashboard();

                            var aUpdatedTimesheets = oDashboardModel.getProperty("/timesheets") || [];
                            var oUpdated = aUpdatedTimesheets.find(function (t) { return t.ID === oTimesheet.ID; });
                            if (oUpdated) {
                                oDashboardModel.setProperty("/selectedTimesheet", oUpdated);
                                oDashboardModel.setProperty("/showEntriesPanel", true);
                            }
                        } catch (oError) {
                            MessageBox.error(
                                this._getErrorMessage(oError, "Failed to update Timesheet dates.")
                            );
                        } finally {
                            oDialog.setBusy(false);
                        }
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open();
        },

        /* ========================================================== */
        /* CREATE TIMESHEET                                          */
        /* ========================================================== */

        onCreateTimesheet: function () {
            if (!this._getEmployeeID()) {
                this._openEmployeeSelectionDialog();
                return;
            }

            var oStartDate =
                new DatePicker({
                    width: "100%",
                    valueFormat:
                        "yyyy-MM-dd",
                    displayFormat:
                        "yyyy-MM-dd"
                });

            var oEndDate =
                new DatePicker({
                    width: "100%",
                    valueFormat:
                        "yyyy-MM-dd",
                    displayFormat:
                        "yyyy-MM-dd"
                });

            var oDialog =
                new Dialog({
                    title:
                        "Create Timesheet",

                    contentWidth:
                        "30rem",

                    content: [
                        new VBox({
                            items: [
                                new Label({
                                    text:
                                        "Week Start",

                                    required:
                                        true,

                                    labelFor:
                                        oStartDate
                                }),

                                oStartDate,

                                new Label({
                                    text:
                                        "Week End",

                                    required:
                                        true,

                                    labelFor:
                                        oEndDate
                                }).addStyleClass(
                                    "sapUiSmallMarginTop"
                                ),

                                oEndDate
                            ]
                        }).addStyleClass(
                            "sapUiSmallMargin"
                        )
                    ],

                    beginButton:
                        new Button({
                            text:
                                "Create",

                            type:
                                "Emphasized",

                            press:
                                async function () {
                                    var sStartDate =
                                        oStartDate
                                            .getValue();

                                    var sEndDate =
                                        oEndDate
                                            .getValue();

                                    if (
                                        !sStartDate ||
                                        !sEndDate
                                    ) {
                                        MessageBox.warning(
                                            "Week Start and Week End are mandatory."
                                        );

                                        return;
                                    }

                                    if (
                                        sEndDate <
                                        sStartDate
                                    ) {
                                        MessageBox.warning(
                                            "Week End cannot be before Week Start."
                                        );

                                        return;
                                    }

                                    try {
                                        oDialog.setBusy(
                                            true
                                        );

                                        await this
                                            ._executeUnboundAction(
                                                "createTimesheet",
                                                {
                                                    employeeID:
                                                        this
                                                            ._getEmployeeID(),

                                                    approvedByID:
                                                        null,

                                                    invoiceID:
                                                        null,

                                                    weekStartDate:
                                                        sStartDate,

                                                    weekEndDate:
                                                        sEndDate,

                                                    totalBillableHours:
                                                        0,

                                                    submittedDate:
                                                        null,

                                                    approvedDate:
                                                        null,

                                                    status:
                                                        "Draft"
                                                }
                                            );

                                        MessageToast.show(
                                            "Timesheet created successfully"
                                        );

                                        oDialog.close();

                                        await this
                                            ._loadEmployeeDashboard();

                                    } catch (oError) {
                                        MessageBox.error(
                                            this._getErrorMessage(
                                                oError,
                                                "Timesheet creation failed."
                                            )
                                        );

                                    } finally {
                                        oDialog.setBusy(
                                            false
                                        );
                                    }
                                }.bind(this)
                        }),

                    endButton:
                        new Button({
                            text:
                                "Cancel",

                            press:
                                function () {
                                    oDialog.close();
                                }
                        }),

                    afterClose:
                        function () {
                            oDialog.destroy();
                        }
                });

            this.getView().addDependent(
                oDialog
            );

            oDialog.open();
        },

        /* ========================================================== */
        /* TIMESHEET ENTRY                                           */
        /* ========================================================== */

        _openEntryDialog:
            function (
                oExistingEntry
            ) {
                var oDashboardModel =
                    this.getView()
                        .getModel(
                            "employeeDashboard"
                        );

                var oTimesheet =
                    oDashboardModel.getProperty(
                        "/selectedTimesheet"
                    );

                var aTasks =
                    oDashboardModel.getProperty(
                        "/tasks"
                    ) || [];

                var bEdit =
                    Boolean(
                        oExistingEntry
                    );

                if (
                    !oTimesheet ||
                    !oTimesheet.ID
                ) {
                    MessageBox.warning(
                        "Select a Timesheet first."
                    );

                    return;
                }

                if (!oTimesheet.canEdit) {
                    MessageBox.warning(
                        "Only Draft or Rejected Timesheets can be changed."
                    );

                    return;
                }

                if (!aTasks.length) {
                    MessageBox.warning(
                        "No active Tasks are assigned to the selected Employee."
                    );

                    return;
                }

                var oTaskSelect =
                    new Select({
                        width:
                            "100%",

                        enabled:
                            !bEdit
                    });

                aTasks.forEach(
                    function (oTask) {
                        oTaskSelect.addItem(
                            new Item({
                                key:
                                    oTask.ID,

                                text:
                                    oTask.taskName
                            })
                        );
                    }
                );

                if (bEdit) {
                    oTaskSelect.setSelectedKey(
                        oExistingEntry.taskID
                    );
                } else {
                    oTaskSelect.setSelectedKey(
                        aTasks[0].ID
                    );
                }

                var oWorkDate =
                    new DatePicker({
                        width:
                            "100%",

                        value:
                            bEdit
                                ? oExistingEntry.workDate
                                : oTimesheet.weekStartDate,

                        valueFormat:
                            "yyyy-MM-dd",

                        displayFormat:
                            "yyyy-MM-dd"
                    });

                var oHoursInput =
                    new Input({
                        width:
                            "100%",

                        type:
                            "Number",

                        value:
                            bEdit
                                ? String(
                                    oExistingEntry.hours
                                )
                                : ""
                    });

                var oBillable =
                    new CheckBox({
                        text:
                            "Billable",

                        selected:
                            bEdit
                                ? oExistingEntry.billable
                                : true
                    });

                var oDialog =
                    new Dialog({
                        title:
                            bEdit
                                ? "Edit Timesheet Entry"
                                : "Add Timesheet Entry",

                        contentWidth:
                            "30rem",

                        content: [
                            new VBox({
                                items: [
                                    new Label({
                                        text:
                                            "Task",

                                        required:
                                            true,

                                        labelFor:
                                            oTaskSelect
                                    }),

                                    oTaskSelect,

                                    new Label({
                                        text:
                                            "Work Date",

                                        required:
                                            true,

                                        labelFor:
                                            oWorkDate
                                    }).addStyleClass(
                                        "sapUiSmallMarginTop"
                                    ),

                                    oWorkDate,

                                    new Label({
                                        text:
                                            "Hours",

                                        required:
                                            true,

                                        labelFor:
                                            oHoursInput
                                    }).addStyleClass(
                                        "sapUiSmallMarginTop"
                                    ),

                                    oHoursInput,

                                    oBillable.addStyleClass(
                                        "sapUiSmallMarginTop"
                                    )
                                ]
                            }).addStyleClass(
                                "sapUiSmallMargin"
                            )
                        ],

                        beginButton:
                            new Button({
                                text:
                                    bEdit
                                        ? "Save"
                                        : "Add",

                                type:
                                    "Emphasized",

                                press:
                                    async function () {
                                        var sTaskID =
                                            oTaskSelect
                                                .getSelectedKey();

                                        var sWorkDate =
                                            oWorkDate
                                                .getValue();

                                        var nHours =
                                            Number(
                                                oHoursInput
                                                    .getValue()
                                            );

                                        var bBillable =
                                            oBillable
                                                .getSelected();

                                        if (
                                            !sTaskID ||
                                            !sWorkDate
                                        ) {
                                            MessageBox.warning(
                                                "Task and Work Date are mandatory."
                                            );

                                            return;
                                        }

                                        if (
                                            !Number.isFinite(
                                                nHours
                                            ) ||
                                            nHours < 0.25 ||
                                            nHours > 24
                                        ) {
                                            MessageBox.warning(
                                                "Hours must be between 0.25 and 24."
                                            );

                                            return;
                                        }

                                        if (
                                            sWorkDate <
                                                oTimesheet.weekStartDate ||
                                            sWorkDate >
                                                oTimesheet.weekEndDate
                                        ) {
                                            MessageBox.warning(
                                                "Work Date must be inside the Timesheet week."
                                            );

                                            return;
                                        }

                                        try {
                                            oDialog.setBusy(
                                                true
                                            );

                                            if (bEdit) {
                                                await this
                                                    ._executeUnboundAction(
                                                        "updateTimesheetEntry",
                                                        {
                                                            ID:
                                                                oExistingEntry.ID,

                                                            workDate:
                                                                sWorkDate,

                                                            hours:
                                                                nHours,

                                                            billable:
                                                                bBillable
                                                        }
                                                    );
                                            } else {
                                                await this
                                                    ._executeUnboundAction(
                                                        "createTimesheetEntry",
                                                        {
                                                            timesheetID:
                                                                oTimesheet.ID,

                                                            taskID:
                                                                sTaskID,

                                                            workDate:
                                                                sWorkDate,

                                                            hours:
                                                                nHours,

                                                            billable:
                                                                bBillable
                                                        }
                                                    );
                                            }

                                            MessageToast.show(
                                                bEdit
                                                    ? "Entry updated successfully"
                                                    : "Entry added successfully"
                                            );

                                            oDialog.close();

                                            await this
                                                ._loadEmployeeDashboard();

                                        } catch (oError) {
                                            MessageBox.error(
                                                this._getErrorMessage(
                                                    oError,
                                                    "Timesheet Entry operation failed."
                                                )
                                            );

                                        } finally {
                                            oDialog.setBusy(
                                                false
                                            );
                                        }
                                    }.bind(this)
                            }),

                        endButton:
                            new Button({
                                text:
                                    "Cancel",

                                press:
                                    function () {
                                        oDialog.close();
                                    }
                            }),

                        afterClose:
                            function () {
                                oDialog.destroy();
                            }
                    });

                this.getView().addDependent(
                    oDialog
                );

                oDialog.open();
            },

        onAddEntry: function () {
            this._openEntryDialog(
                null
            );
        },

        onEditEntry: function (
            oEvent
        ) {
            var oContext =
                oEvent.getSource()
                    .getBindingContext(
                        "employeeDashboard"
                    );

            if (!oContext) {
                return;
            }

            this._openEntryDialog(
                oContext.getObject()
            );
        },

        onDeleteEntry: function (
            oEvent
        ) {
            var oContext =
                oEvent.getSource()
                    .getBindingContext(
                        "employeeDashboard"
                    );

            var oTimesheet =
                this.getView()
                    .getModel(
                        "employeeDashboard"
                    )
                    .getProperty(
                        "/selectedTimesheet"
                    );

            if (!oContext) {
                return;
            }

            if (!oTimesheet.canEdit) {
                MessageBox.warning(
                    "Only Draft or Rejected entries can be deleted."
                );

                return;
            }

            var oEntry =
                oContext.getObject();

            MessageBox.confirm(
                "Delete this Timesheet Entry?",
                {
                    title:
                        "Delete Entry",

                    emphasizedAction:
                        MessageBox.Action.DELETE,

                    actions: [
                        MessageBox.Action.DELETE,
                        MessageBox.Action.CANCEL
                    ],

                    onClose:
                        async function (
                            sAction
                        ) {
                            if (
                                sAction !==
                                MessageBox.Action.DELETE
                            ) {
                                return;
                            }

                            try {
                                await this
                                    ._executeUnboundAction(
                                        "deleteTimesheetEntry",
                                        {
                                            ID:
                                                oEntry.ID
                                        }
                                    );

                                MessageToast.show(
                                    "Entry deleted successfully"
                                );

                                await this
                                    ._loadEmployeeDashboard();

                            } catch (oError) {
                                MessageBox.error(
                                    this._getErrorMessage(
                                        oError,
                                        "Entry deletion failed."
                                    )
                                );
                            }
                        }.bind(this)
                }
            );
        },

        /* ========================================================== */
        /* SUBMIT AND REFRESH                                        */
        /* ========================================================== */

        onSubmitSelectedTimesheet:
            function () {
                var oTimesheet =
                    this.getView()
                        .getModel(
                            "employeeDashboard"
                        )
                        .getProperty(
                            "/selectedTimesheet"
                        );

                if (
                    !oTimesheet ||
                    !oTimesheet.ID
                ) {
                    MessageBox.warning(
                        "Select a Timesheet first."
                    );

                    return;
                }

                if (!oTimesheet.canSubmit) {
                    MessageBox.warning(
                        "Add at least one Entry before submitting."
                    );

                    return;
                }

                MessageBox.confirm(
                    "Submit this Timesheet for Manager approval?",
                    {
                        title:
                            "Submit Timesheet",

                        emphasizedAction:
                            MessageBox.Action.OK,

                        actions: [
                            MessageBox.Action.OK,
                            MessageBox.Action.CANCEL
                        ],

                        onClose:
                            async function (
                                sAction
                            ) {
                                if (
                                    sAction !==
                                    MessageBox.Action.OK
                                ) {
                                    return;
                                }

                                try {
                                    await this
                                        ._executeBoundAction(
                                            "Timesheets",
                                            oTimesheet.ID,
                                            "submitTimesheet"
                                        );

                                    MessageToast.show(
                                        "Timesheet submitted successfully"
                                    );

                                    await this
                                        ._loadEmployeeDashboard();

                                } catch (oError) {
                                    MessageBox.error(
                                        this._getErrorMessage(
                                            oError,
                                            "Timesheet submission failed."
                                        )
                                    );
                                }
                            }.bind(this)
                    }
                );
            },

        onRefresh: async function () {
            if (!this._getEmployeeID()) {
                this._openEmployeeSelectionDialog();
                return;
            }

            await this
                ._loadEmployeeDashboard();

            MessageToast.show(
                "Employee Dashboard refreshed"
            );
        }
    });
});