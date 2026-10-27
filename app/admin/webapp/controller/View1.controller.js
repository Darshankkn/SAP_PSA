sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Select",
    "sap/m/DatePicker",
    "sap/m/Button",
    "sap/ui/core/Item",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    JSONModel,
    MessageBox,
    MessageToast,
    Dialog,
    VBox,
    Label,
    Input,
    Select,
    DatePicker,
    Button,
    Item,
    Filter,
    FilterOperator
) {
    "use strict";

    return Controller.extend("admin.controller.View1", {
        onInit: function () {
            var oModel = new JSONModel({
                activeEmployees: 0,
                activeManagers: 0,
                activeClients: 0,
                activeProjects: 0,
                missingBudgets: 0,
                pendingPayments: 0,
                paidInvoices: 0,
                dataIssues: 0,
                totalInvoicedAmount: 0,
                totalPaidAmount: 0,
                outstandingAmount: 0,
                totalInvoicedDisplay: "$0.00",
                totalPaidDisplay: "$0.00",
                outstandingDisplay: "$0.00",
                unpaidInvoices: 0,
                overdueInvoices: 0,
                employees: [],
                managers: [],
                clients: [],
                projects: [],
                budgets: [],
                milestones: [],
                assignments: [],
                invoices: [],
                issues: []
            });

            oModel.setSizeLimit(5000);

            this.getView().setModel(
                oModel,
                "admin"
            );

            this._loadAdminDashboard();
        },

        _number: function (vValue) {
            var nValue = Number(vValue);

            return Number.isFinite(nValue)
                ? nValue
                : 0;
        },

        _state: function (sStatus) {
            switch (
                String(sStatus || "")
                    .replace(/\s+/g, "")
                    .toLowerCase()
            ) {
                case "active":
                case "paid":
                case "completed":
                case "withinbudget":
                case "approved":
                    return "Success";

                case "draft":
                case "pending":
                case "notstarted":
                case "atrisk":
                case "onhold":
                case "delayed":
                    return "Warning";

                case "issued":
                case "sent":
                case "inprogress":
                    return "Information";

                case "inactive":
                case "terminated":
                case "cancelled":
                case "blocked":
                case "breached":
                case "overdue":
                    return "Error";

                default:
                    return "None";
            }
        },

        _error: function (
            oError,
            sFallback
        ) {
            var sMessage =
                oError && oError.message;

            try {
                var sResponseText =
                    oError &&
                    oError.cause &&
                    oError.cause.error &&
                    oError.cause.error.responseText;

                var oResponse =
                    JSON.parse(sResponseText);

                if (
                    oResponse &&
                    oResponse.error &&
                    oResponse.error.message
                ) {
                    sMessage =
                        typeof oResponse.error.message ===
                        "string"
                            ? oResponse.error.message
                            : oResponse.error.message.value;
                }
            } catch (oIgnoredError) {
                // Preserve the original error message.
            }

            return sMessage || sFallback;
        },

        _row: function (oEvent) {
            var oContext =
                oEvent
                    .getSource()
                    .getBindingContext("admin");

            return oContext
                ? oContext.getObject()
                : null;
        },

        _input: function (
            sType,
            vValue
        ) {
            return new Input({
                width: "100%",
                type: sType || "Text",
                value:
                    vValue === undefined ||
                    vValue === null
                        ? ""
                        : String(vValue)
            });
        },

        _date: function (sValue) {
            return new DatePicker({
                width: "100%",
                value: sValue || "",
                valueFormat: "yyyy-MM-dd",
                displayFormat: "yyyy-MM-dd"
            });
        },

        _select: function (
            aRecords,
            sTextProperty,
            sSelectedKey,
            bAllowEmpty
        ) {
            var oSelect =
                new Select({
                    width: "100%"
                });

            if (bAllowEmpty) {
                oSelect.addItem(
                    new Item({
                        key: "",
                        text: "Select"
                    })
                );
            }

            (aRecords || []).forEach(
                function (oRecord) {
                    oSelect.addItem(
                        new Item({
                            key:
                                oRecord.ID,

                            text:
                                oRecord[sTextProperty] ||
                                oRecord.ID
                        })
                    );
                }
            );

            if (sSelectedKey) {
                oSelect.setSelectedKey(
                    sSelectedKey
                );
            } else if (
                !bAllowEmpty &&
                aRecords &&
                aRecords.length
            ) {
                oSelect.setSelectedKey(
                    aRecords[0].ID
                );
            }

            return oSelect;
        },

        _field: function (
            sText,
            oControl,
            bRequired
        ) {
            return [
                new Label({
                    text: sText,
                    required: Boolean(bRequired),
                    labelFor: oControl
                }).addStyleClass(
                    "sapUiSmallMarginTop"
                ),

                oControl
            ];
        },

        _openDialog: function (
            sTitle,
            aItems,
            fnSave
        ) {
            var oDialog =
                new Dialog({
                    title: sTitle,
                    contentWidth: "35rem",
                    verticalScrolling: true,
                    busyIndicatorDelay: 0,

                    content: [
                        new VBox({
                            items: aItems
                        }).addStyleClass(
                            "sapUiSmallMargin"
                        )
                    ],

                    beginButton:
                        new Button({
                            text: "Save",
                            type: "Emphasized",

                            press:
                                async function () {
                                    var oSaveButton =
                                        oDialog
                                            .getBeginButton();

                                    try {
                                        oDialog.setBusy(
                                            true
                                        );

                                        oSaveButton.setEnabled(
                                            false
                                        );

                                        await fnSave();

                                        oDialog.close();

                                        MessageToast.show(
                                            "Saved successfully"
                                        );

                                        await this
                                            ._loadAdminDashboard();

                                    } catch (oError) {
                                        console.error(
                                            sTitle +
                                            " failed:",
                                            oError
                                        );

                                        MessageBox.error(
                                            this._error(
                                                oError,
                                                sTitle +
                                                " failed."
                                            )
                                        );

                                    } finally {
                                        oDialog.setBusy(
                                            false
                                        );

                                        oSaveButton.setEnabled(
                                            true
                                        );
                                    }
                                }.bind(this)
                        }),

                    endButton:
                        new Button({
                            text: "Cancel",

                            press:
                                function () {
                                    var oODataModel =
                                        this
                                            .getOwnerComponent()
                                            .getModel();

                                    try {
                                        if (
                                            oODataModel &&
                                            oODataModel
                                                .hasPendingChanges()
                                        ) {
                                            oODataModel
                                                .resetChanges();
                                        }
                                    } catch (
                                        oResetError
                                    ) {
                                        console.warn(
                                            "Reset changes failed:",
                                            oResetError
                                        );
                                    }

                                    oDialog.close();
                                }.bind(this)
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

            return oDialog;
        },

        _read: async function (sPath) {
            var oBinding =
                this
                    .getOwnerComponent()
                    .getModel()
                    .bindList(sPath);

            var aContexts =
                await oBinding
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

        _create: function (
            sEntitySet,
            oPayload
        ) {
            var oModel =
                this
                    .getOwnerComponent()
                    .getModel();

            if (!oModel) {
                return Promise.reject(
                    new Error(
                        "OData model is unavailable."
                    )
                );
            }

            var oBinding =
                oModel.bindList(
                    "/" + sEntitySet,
                    null,
                    null,
                    null,
                    {
                        "$$updateGroupId":
                            "$direct"
                    }
                );

            return new Promise(
                function (
                    resolve,
                    reject
                ) {
                    var oCreatedContext;
                    var bCompleted = false;
                    var iTimeoutID;

                    var fnDetach =
                        function () {
                            clearTimeout(
                                iTimeoutID
                            );

                            oBinding
                                .detachCreateCompleted(
                                    fnCompleted
                                );
                        };

                    var fnFinish =
                        function (
                            bSuccess,
                            oError
                        ) {
                            if (bCompleted) {
                                return;
                            }

                            bCompleted = true;
                            fnDetach();

                            if (
                                bSuccess &&
                                oCreatedContext
                            ) {
                                resolve(
                                    oCreatedContext
                                        .getObject()
                                );

                                return;
                            }

                            if (oCreatedContext) {
                                try {
                                    var oDeletePromise =
                                        oCreatedContext
                                            .delete(
                                                "$direct"
                                            );

                                    if (
                                        oDeletePromise &&
                                        typeof oDeletePromise
                                            .catch ===
                                            "function"
                                    ) {
                                        oDeletePromise.catch(
                                            function (
                                                oCleanupError
                                            ) {
                                                console.warn(
                                                    "Transient cleanup failed:",
                                                    oCleanupError
                                                );
                                            }
                                        );
                                    }
                                } catch (
                                    oCleanupError
                                ) {
                                    console.warn(
                                        "Transient cleanup failed:",
                                        oCleanupError
                                    );
                                }
                            }

                            reject(
                                oError ||
                                new Error(
                                    sEntitySet +
                                    " creation was rejected."
                                )
                            );
                        };

                    var fnCompleted =
                        function (oEvent) {
                            var oEventContext =
                                oEvent.getParameter(
                                    "context"
                                );

                            if (
                                oCreatedContext &&
                                oEventContext !==
                                oCreatedContext
                            ) {
                                return;
                            }

                            var bSuccess =
                                oEvent.getParameter(
                                    "success"
                                );

                            fnFinish(
                                bSuccess,
                                bSuccess
                                    ? null
                                    : new Error(
                                        "The server rejected the " +
                                        sEntitySet +
                                        " data. Check the property names and mandatory fields."
                                    )
                            );
                        };

                    oBinding
                        .attachCreateCompleted(
                            fnCompleted
                        );

                    iTimeoutID =
                        setTimeout(
                            function () {
                                fnFinish(
                                    false,
                                    new Error(
                                        sEntitySet +
                                        " creation did not complete within 15 seconds."
                                    )
                                );
                            },
                            15000
                        );

                    try {
                        oCreatedContext =
                            oBinding.create(
                                oPayload
                            );
                    } catch (oError) {
                        fnFinish(
                            false,
                            oError
                        );
                    }
                }
            );
        },

        _context: async function (
            sEntitySet,
            sID
        ) {
            var oBinding =
                this
                    .getOwnerComponent()
                    .getModel()
                    .bindContext(
                        "/" +
                        sEntitySet +
                        "(" +
                        sID +
                        ")"
                    );

            await oBinding.requestObject();

            return oBinding
                .getBoundContext();
        },

        _update: async function (
            sEntitySet,
            sID,
            oPayload
        ) {
            var oContext =
                await this._context(
                    sEntitySet,
                    sID
                );

            await Promise.all(
                Object.keys(
                    oPayload
                ).map(
                    function (
                        sProperty
                    ) {
                        return oContext
                            .setProperty(
                                sProperty,
                                oPayload[
                                    sProperty
                                ]
                            );
                    }
                )
            );
        },

        _delete: async function (
            sEntitySet,
            sID
        ) {
            var oContext =
                await this._context(
                    sEntitySet,
                    sID
                );

            await oContext.delete();
        },

        _boundAction:
            async function (
                sEntitySet,
                sID,
                sAction
            ) {
                var oOperation =
                    this
                        .getOwnerComponent()
                        .getModel()
                        .bindContext(
                            "/" +
                            sEntitySet +
                            "(" +
                            sID +
                            ")/CatalogService." +
                            sAction +
                            "(...)"
                        );

                await oOperation.execute();
            },

        _toggle: async function (
            sEntitySet,
            oEvent
        ) {
            var oRecord =
                this._row(oEvent);

            if (!oRecord) {
                return;
            }

            try {
                await this._update(
                    sEntitySet,
                    oRecord.ID,
                    {
                        status:
                            oRecord.status ===
                                "Active"
                                ? "Inactive"
                                : "Active"
                    }
                );

                await this
                    ._loadAdminDashboard();

                MessageToast.show(
                    "Status updated"
                );

            } catch (oError) {
                MessageBox.error(
                    this._error(
                        oError,
                        "Status update failed."
                    )
                );
            }
        },

        _confirmDelete: function (
            sEntitySet,
            oRecord,
            sName
        ) {
            if (
                !oRecord ||
                !oRecord.ID
            ) {
                MessageBox.error(
                    "Record ID is unavailable."
                );

                return;
            }

            MessageBox.confirm(
                "Delete " +
                sName +
                "?",
                {
                    title:
                        "Confirm Delete",

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
                                this
                                    .getView()
                                    .setBusy(
                                        true
                                    );

                                await this
                                    ._delete(
                                        sEntitySet,
                                        oRecord.ID
                                    );

                                await this
                                    ._loadAdminDashboard();

                                MessageToast.show(
                                    "Deleted successfully"
                                );

                            } catch (oError) {
                                MessageBox.error(
                                    this._error(
                                        oError,
                                        "Delete failed. Related records may exist."
                                    )
                                );

                            } finally {
                                this
                                    .getView()
                                    .setBusy(
                                        false
                                    );
                            }
                        }.bind(this)
                }
            );
        },

        _loadAdminDashboard:
            async function () {
                var oView =
                    this.getView();

                var oAdmin =
                    oView.getModel(
                        "admin"
                    );

                oView.setBusy(true);

                try {
                    var aResults =
                        await Promise.all([
                            this._read(
                                "/Employees"
                            ),
                            this._read(
                                "/Managers"
                            ),
                            this._read(
                                "/Clients"
                            ),
                            this._read(
                                "/Projects"
                            ),
                            this._read(
                                "/Budgets"
                            ),
                            this._read(
                                "/Milestones"
                            ),
                            this._read(
                                "/Tasks"
                            ),
                            this._read(
                                "/Invoices"
                            ),
                            this._read(
                                "/Timesheets"
                            )
                        ]);

                    var aEmployees =
                        aResults[0];

                    var aManagers =
                        aResults[1];

                    var aClients =
                        aResults[2];

                    var aProjects =
                        aResults[3];

                    var aBudgets =
                        aResults[4];

                    var aMilestones =
                        aResults[5];

                    var aTasks =
                        aResults[6];

                    var aInvoices =
                        aResults[7];

                    var aTimesheets =
                        aResults[8];

                    var mEmployees =
                        new Map();

                    var mManagers =
                        new Map();

                    var mClients =
                        new Map();

                    var mProjects =
                        new Map();

                    var mMilestones =
                        new Map();

                    var mBudgets =
                        new Map();

                    aEmployees.forEach(
                        function (oRecord) {
                            mEmployees.set(
                                oRecord.ID,
                                oRecord
                            );
                        }
                    );

                    aManagers.forEach(
                        function (oRecord) {
                            mManagers.set(
                                oRecord.ID,
                                oRecord
                            );
                        }
                    );

                    aClients.forEach(
                        function (oRecord) {
                            mClients.set(
                                oRecord.ID,
                                oRecord
                            );
                        }
                    );

                    aProjects.forEach(
                        function (oRecord) {
                            mProjects.set(
                                oRecord.ID,
                                oRecord
                            );
                        }
                    );

                    aMilestones.forEach(
                        function (oRecord) {
                            mMilestones.set(
                                oRecord.ID,
                                oRecord
                            );
                        }
                    );

                    aBudgets.forEach(
                        function (oRecord) {
                            if (
                                oRecord
                                    .project_ID
                            ) {
                                mBudgets.set(
                                    oRecord
                                        .project_ID,
                                    oRecord
                                );
                            }
                        }
                    );

                    var aEmployeeRows =
                        aEmployees.map(
                            function (
                                oRecord
                            ) {
                                return {
                                    ID:
                                        oRecord.ID,

                                    firstName:
                                        oRecord
                                            .firstName ||
                                        "",

                                    lastName:
                                        oRecord
                                            .lastName ||
                                        "",

                                    employeeName:
                                        [
                                            oRecord
                                                .firstName,
                                            oRecord
                                                .lastName
                                        ]
                                            .filter(
                                                Boolean
                                            )
                                            .join(
                                                " "
                                            ) ||
                                        oRecord
                                            .email ||
                                        "Employee",

                                    email:
                                        oRecord
                                            .email ||
                                        "",

                                    jobTitle:
                                        oRecord
                                            .jobTitle ||
                                        "",

                                    joinDate:
                                        oRecord
                                            .joinDate ||
                                        "",

                                    hourlyRate:
                                        this
                                            ._number(
                                                oRecord
                                                    .hourlyRate
                                            ),

                                    status:
                                        oRecord
                                            .status ||
                                        "Active",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .status
                                            )
                                };
                            }.bind(this)
                        );

                    var aManagerRows =
                        aManagers.map(
                            function (
                                oRecord
                            ) {
                                var oEmployee =
                                    mEmployees
                                        .get(
                                            oRecord
                                                .employee_ID
                                        ) ||
                                    {};

                                return {
                                    ID:
                                        oRecord.ID,

                                    employeeID:
                                        oRecord
                                            .employee_ID ||
                                        "",

                                    managerName:
                                        [
                                            oEmployee
                                                .firstName,
                                            oEmployee
                                                .lastName
                                        ]
                                            .filter(
                                                Boolean
                                            )
                                            .join(
                                                " "
                                            ) ||
                                        oEmployee
                                            .email ||
                                        "Manager",

                                    managerLevel:
                                        oRecord
                                            .managerLevel ||
                                        "",

                                    status:
                                        oRecord
                                            .status ||
                                        "Active",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .status
                                            )
                                };
                            }.bind(this)
                        );

                    var aClientRows =
                        aClients.map(
                            function (
                                oRecord
                            ) {
                                return {
                                    ID:
                                        oRecord.ID,

                                    clientName:
                                        oRecord
                                            .clientName ||
                                        oRecord
                                            .name ||
                                        "Client",

                                    contactPerson:
                                        oRecord
                                            .contactPerson ||
                                        oRecord
                                            .contactName ||
                                        "",

                                    email:
                                            oRecord.email ||
                                            "",

                                        phone:
                                            oRecord.phoneNumber ||
                                            "",

                                    country:
                                        oRecord
                                            .country ||
                                        "",

                                    industry:
                                        oRecord
                                            .industry ||
                                        "",

                                    status:
                                        oRecord
                                            .status ||
                                        "Active",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .status
                                            )
                                };
                            }.bind(this)
                        );

                    var aProjectRows =
                        aProjects.map(
                            function (
                                oRecord
                            ) {
                                var oClient =
                                    mClients
                                        .get(
                                            oRecord
                                                .client_ID
                                        ) ||
                                    {};

                                var oManager =
                                    mManagers
                                        .get(
                                            oRecord
                                                .manager_ID
                                        ) ||
                                    {};

                                var oManagerEmployee =
                                    mEmployees
                                        .get(
                                            oManager
                                                .employee_ID
                                        ) ||
                                    {};

                                return {
                                    ID:
                                        oRecord.ID,

                                    projectCode:
                                        oRecord
                                            .projectCode ||
                                        "",

                                    projectName:
                                        oRecord
                                            .projectName ||
                                        "Project",

                                    displayName:
                                        (
                                            oRecord
                                                .projectCode ||
                                            ""
                                        ) +
                                        " - " +
                                        (
                                            oRecord
                                                .projectName ||
                                            "Project"
                                        ),

                                    clientID:
                                        oRecord
                                            .client_ID ||
                                        "",

                                    clientName:
                                        oClient
                                            .clientName ||
                                        oClient
                                            .name ||
                                        "Not Assigned",

                                    managerID:
                                        oRecord
                                            .manager_ID ||
                                        "",

                                    managerName:
                                        [
                                            oManagerEmployee
                                                .firstName,
                                            oManagerEmployee
                                                .lastName
                                        ]
                                            .filter(
                                                Boolean
                                            )
                                            .join(
                                                " "
                                            ) ||
                                        "Not Assigned",

                                    billingType:
                                        oRecord
                                            .billingType ||
                                        "",

                                    startDate:
                                        oRecord
                                            .startDate ||
                                        "",

                                    endDate:
                                        oRecord
                                            .endDate ||
                                        "",

                                    plannedHours:
                                        this
                                            ._number(
                                                oRecord
                                                    .plannedHours
                                            ),

                                    consumedHours:
                                        this
                                            ._number(
                                                oRecord
                                                    .consumedHours
                                            ),

                                    status:
                                        oRecord
                                            .status ||
                                        "",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .status
                                            ),

                                    hasBudget:
                                        mBudgets.has(
                                            oRecord.ID
                                        )
                                };
                            }.bind(this)
                        );

                    var aBudgetRows =
                        aBudgets.map(
                            function (
                                oRecord
                            ) {
                                var oProject =
                                    mProjects
                                        .get(
                                            oRecord
                                                .project_ID
                                        ) ||
                                    {};

                                return {
                                    ID:
                                        oRecord.ID,

                                    projectID:
                                        oRecord
                                            .project_ID ||
                                        "",

                                    projectCode:
                                        oProject
                                            .projectCode ||
                                        "",

                                    projectName:
                                        oProject
                                            .projectName ||
                                        "Project",

                                    budgetAmount:
                                        this
                                            ._number(
                                                oRecord
                                                    .budgetAmount
                                            ),

                                    consumedAmount:
                                        this
                                            ._number(
                                                oRecord
                                                    .consumedAmount
                                            ),

                                    remainingAmount:
                                        this
                                            ._number(
                                                oRecord
                                                    .remainingAmount
                                            ),

                                    billingRateHr:
                                        this
                                            ._number(
                                                oRecord
                                                    .billingRateHr
                                            ),

                                    currencyCode:
                                        oRecord
                                            .currencyCode ||
                                        "",

                                    budgetStatus:
                                        oRecord
                                            .budgetStatus ||
                                        "WithinBudget",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .budgetStatus
                                            )
                                };
                            }.bind(this)
                        );

                    var aMilestoneRows =
                        aMilestones.map(
                            function (
                                oRecord
                            ) {
                                var oProject =
                                    mProjects
                                        .get(
                                            oRecord
                                                .project_ID
                                        ) ||
                                    {};

                                return {
                                    ID:
                                        oRecord.ID,

                                    projectID:
                                        oRecord
                                            .project_ID ||
                                        "",

                                    projectCode:
                                        oProject
                                            .projectCode ||
                                        "",

                                    projectName:
                                        oProject
                                            .projectName ||
                                        "Missing Project",

                                    milestoneName:
                                        oRecord
                                            .milestoneName ||
                                        "",

                                    startDate:
                                        oRecord
                                            .startDate ||
                                        "",

                                    endDate:
                                        oRecord
                                            .endDate ||
                                        "",

                                    completionPercent:
                                        this
                                            ._number(
                                                oRecord
                                                    .completionPercent
                                            ),

                                    status:
                                        oRecord
                                            .status ||
                                        "NotStarted",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .status
                                            )
                                };
                            }.bind(this)
                        );

                    var aAssignmentRows =
                        aTasks.map(
                            function (
                                oRecord
                            ) {
                                var oMatch =
                                    String(
                                        oRecord
                                            .taskName ||
                                        ""
                                    ).match(
                                        /^\[([0-9a-fA-F-]{36})\]\s*(.*)$/
                                    );

                                var sEmployeeID =
                                    oMatch
                                        ? oMatch[1]
                                        : "";

                                var oEmployee =
                                    mEmployees
                                        .get(
                                            sEmployeeID
                                        ) ||
                                    {};

                                var oMilestone =
                                    mMilestones
                                        .get(
                                            oRecord
                                                .milestone_ID
                                        ) ||
                                    {};

                                var oProject =
                                    mProjects
                                        .get(
                                            oMilestone
                                                .project_ID
                                        ) ||
                                    {};

                                return {
                                    ID:
                                        oRecord.ID,

                                    employeeID:
                                        sEmployeeID,

                                    employeeName:
                                        [
                                            oEmployee
                                                .firstName,
                                            oEmployee
                                                .lastName
                                        ]
                                            .filter(
                                                Boolean
                                            )
                                            .join(
                                                " "
                                            ) ||
                                        (
                                            sEmployeeID
                                                ? "Unknown Employee"
                                                : "Unassigned"
                                        ),

                                    taskName:
                                        oMatch
                                            ? oMatch[2]
                                            : (
                                                oRecord
                                                    .taskName ||
                                                ""
                                            ),

                                    projectID:
                                        oMilestone
                                            .project_ID ||
                                        "",

                                    projectCode:
                                        oProject
                                            .projectCode ||
                                        "",

                                    projectName:
                                        oProject
                                            .projectName ||
                                        "Missing Project",

                                    milestoneID:
                                        oRecord
                                            .milestone_ID ||
                                        "",

                                    milestoneName:
                                        oMilestone
                                            .milestoneName ||
                                        "Missing Milestone",

                                    startDate:
                                        oRecord
                                            .startDate ||
                                        "",

                                    endDate:
                                        oRecord
                                            .endDate ||
                                        "",

                                    estimatedHours:
                                        this
                                            ._number(
                                                oRecord
                                                    .estimatedHours
                                            ),

                                    actualHours:
                                        this
                                            ._number(
                                                oRecord
                                                    .actualHours
                                            ),

                                    status:
                                        oRecord
                                            .status ||
                                        "NotStarted",

                                    statusState:
                                        this
                                            ._state(
                                                oRecord
                                                    .status
                                            ),

                                    assigned:
                                        Boolean(
                                            sEmployeeID
                                        )
                                };
                            }.bind(this)
                        );

                    var sTodayDate = new Date().toISOString().slice(0, 10);
                    var nTotalInvoicedAmount = 0;
                    var nTotalPaidAmount = 0;
                    var iUnpaidInvoices = 0;
                    var iOverdueInvoices = 0;

                    var aInvoiceRows =
                        aInvoices.map(
                            function (
                                oRecord
                            ) {
                                var oProject =
                                    mProjects
                                        .get(
                                            oRecord
                                                .project_ID
                                        ) ||
                                    {};

                                var oClient =
                                    mClients
                                        .get(
                                            oRecord
                                                .client_ID
                                        ) ||
                                    {};

                                var sPaymentStatus =
                                    oRecord
                                        .paymentStatus ||
                                    "Draft";

                                var sInvoiceStatus =
                                    oRecord
                                        .status ||
                                    "Draft";

                                var bCancelled =
                                    sInvoiceStatus === "Cancelled";

                                var bPaid =
                                    sPaymentStatus ===
                                        "Paid" ||
                                    sInvoiceStatus ===
                                        "Paid";

                                var nSubtotal =
                                    this._number(
                                        oRecord.totalAmount
                                    );

                                var nTax =
                                    this._number(
                                        oRecord.taxAmount
                                    );

                                var nPayable =
                                    Number((nSubtotal + nTax).toFixed(2));

                                var sDueDate =
                                    String(oRecord.dueDate || "");

                                if (!bCancelled) {
                                    nTotalInvoicedAmount += nPayable;
                                    if (bPaid) {
                                        nTotalPaidAmount += nPayable;
                                    } else {
                                        iUnpaidInvoices++;
                                        if (sDueDate && sDueDate < sTodayDate) {
                                            iOverdueInvoices++;
                                        }
                                    }
                                }

                                var bCanIssue =
                                    !bCancelled &&
                                    !bPaid &&
                                    sPaymentStatus === "Draft" &&
                                    sInvoiceStatus === "Draft";

                                var bCanConfirmPayment =
                                    !bCancelled &&
                                    !bPaid &&
                                    (sPaymentStatus === "Issued" || sInvoiceStatus === "Issued" || sInvoiceStatus === "Sent");

                                return {
                                    ID:
                                        oRecord.ID,

                                    invoiceNumber:
                                        oRecord
                                            .invoiceNumber ||
                                        "",

                                    clientName:
                                        oClient
                                            .clientName ||
                                        oClient
                                            .name ||
                                        "Client",

                                    projectCode:
                                        oProject
                                            .projectCode ||
                                        "",

                                    projectName:
                                        oProject
                                            .projectName ||
                                        "Project",

                                    invoiceDate:
                                        oRecord
                                            .invoiceDate ||
                                        "",

                                    dueDate:
                                        sDueDate,

                                    billableHours:
                                        this
                                            ._number(
                                                oRecord
                                                    .billableHours
                                            ),

                                    subtotal:
                                        nSubtotal,

                                    taxAmount:
                                        nTax,

                                    payableAmount:
                                        nPayable,

                                    currencyCode:
                                        oRecord
                                            .currencyCode ||
                                        "USD",

                                    paymentStatus:
                                        sPaymentStatus,

                                    status:
                                        sInvoiceStatus,

                                    statusState:
                                        this
                                            ._state(
                                                sPaymentStatus
                                            ),

                                    isPaid:
                                        bPaid,

                                    canIssue:
                                        bCanIssue,

                                    canConfirmPayment:
                                        bCanConfirmPayment
                                };
                            }.bind(this)
                        );

                    nTotalInvoicedAmount = Number(nTotalInvoicedAmount.toFixed(2));
                    nTotalPaidAmount = Number(nTotalPaidAmount.toFixed(2));
                    var nOutstandingAmount = Number(Math.max(nTotalInvoicedAmount - nTotalPaidAmount, 0).toFixed(2));

                    var aIssues = [];

                    aManagerRows.forEach(
                        function (oRecord) {
                            if (
                                !oRecord
                                    .employeeID ||
                                !mEmployees.has(
                                    oRecord
                                        .employeeID
                                )
                            ) {
                                aIssues.push({
                                    type:
                                        "Manager",

                                    record:
                                        oRecord.ID,

                                    issue:
                                        "Employee association is invalid",

                                    severity:
                                        "Error"
                                });
                            }
                        }
                    );

                    aProjectRows.forEach(
                        function (oRecord) {
                            if (
                                !oRecord
                                    .managerID
                            ) {
                                aIssues.push({
                                    type:
                                        "Project",

                                    record:
                                        oRecord
                                            .projectCode,

                                    issue:
                                        "Manager is missing",

                                    severity:
                                        "Error"
                                });
                            }

                            if (
                                !oRecord
                                    .clientID
                            ) {
                                aIssues.push({
                                    type:
                                        "Project",

                                    record:
                                        oRecord
                                            .projectCode,

                                    issue:
                                        "Client is missing",

                                    severity:
                                        "Error"
                                });
                            }

                            if (
                                !oRecord
                                    .hasBudget
                            ) {
                                aIssues.push({
                                    type:
                                        "Project",

                                    record:
                                        oRecord
                                            .projectCode,

                                    issue:
                                        "Budget is missing",

                                    severity:
                                        "Error"
                                });
                            }
                        }
                    );

                    aAssignmentRows.forEach(
                        function (oRecord) {
                            if (
                                !oRecord
                                    .assigned
                            ) {
                                aIssues.push({
                                    type:
                                        "Task",

                                    record:
                                        oRecord
                                            .taskName,

                                    issue:
                                        "Employee assignment is missing",

                                    severity:
                                        "Warning"
                                });
                            }

                            if (
                                !oRecord
                                    .milestoneID ||
                                !mMilestones.has(
                                    oRecord
                                        .milestoneID
                                )
                            ) {
                                aIssues.push({
                                    type:
                                        "Task",

                                    record:
                                        oRecord
                                            .taskName,

                                    issue:
                                        "Milestone association is invalid",

                                    severity:
                                        "Error"
                                });
                            }
                        }
                    );

                    aTimesheets.forEach(
                        function (oRecord) {
                            if (
                                oRecord
                                    .status ===
                                    "Invoiced" &&
                                !oRecord
                                    .invoice_ID
                            ) {
                                aIssues.push({
                                    type:
                                        "Timesheet",

                                    record:
                                        oRecord.ID,

                                    issue:
                                        "Invoiced Timesheet has no Invoice",

                                    severity:
                                        "Error"
                                });
                            }
                        }
                    );

                    oAdmin.setData({
                        activeEmployees:
                            aEmployeeRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return (
                                            oRecord
                                                .status ===
                                            "Active"
                                        );
                                    }
                                )
                                .length,

                        activeManagers:
                            aManagerRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return (
                                            oRecord
                                                .status ===
                                            "Active"
                                        );
                                    }
                                )
                                .length,

                        activeClients:
                            aClientRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return (
                                            oRecord
                                                .status ===
                                            "Active"
                                        );
                                    }
                                )
                                .length,

                        activeProjects:
                            aProjectRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return (
                                            oRecord
                                                .status ===
                                            "Active"
                                        );
                                    }
                                )
                                .length,

                        missingBudgets:
                            aProjectRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return !oRecord
                                            .hasBudget;
                                    }
                                )
                                .length,

                        pendingPayments:
                            aInvoiceRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return oRecord
                                            .canConfirmPayment;
                                    }
                                )
                                .length,

                        paidInvoices:
                            aInvoiceRows
                                .filter(
                                    function (
                                        oRecord
                                    ) {
                                        return oRecord
                                            .isPaid;
                                    }
                                )
                                .length,

                        totalInvoicedAmount:
                            nTotalInvoicedAmount,

                        totalPaidAmount:
                            nTotalPaidAmount,

                        outstandingAmount:
                            nOutstandingAmount,

                        totalInvoicedDisplay:
                            "$" + nTotalInvoicedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

                        totalPaidDisplay:
                            "$" + nTotalPaidAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

                        outstandingDisplay:
                            "$" + nOutstandingAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

                        unpaidInvoices:
                            iUnpaidInvoices,

                        overdueInvoices:
                            iOverdueInvoices,

                        dataIssues:
                            aIssues.length,

                        employees:
                            aEmployeeRows,

                        managers:
                            aManagerRows,

                        clients:
                            aClientRows,

                        projects:
                            aProjectRows,

                        budgets:
                            aBudgetRows,

                        milestones:
                            aMilestoneRows,

                        assignments:
                            aAssignmentRows,

                        invoices:
                            aInvoiceRows,

                        issues:
                            aIssues
                    });

                } catch (oError) {
                    console.error(
                        "Admin load failed:",
                        oError
                    );

                    MessageBox.error(
                        this._error(
                            oError,
                            "Admin Dashboard could not be loaded."
                        )
                    );

                } finally {
                    oView.setBusy(false);
                }
            },

        onRefresh: async function () {
            var oODataModel =
                this
                    .getOwnerComponent()
                    .getModel();

            try {
                if (
                    oODataModel &&
                    oODataModel
                        .hasPendingChanges()
                ) {
                    oODataModel
                        .resetChanges();
                }
            } catch (oResetError) {
                console.warn(
                    "Reset changes failed:",
                    oResetError
                );
            }

            await this
                ._loadAdminDashboard();

            MessageToast.show(
                "Admin Dashboard refreshed"
            );
        },

        onAddEmployee: function () {
            this._employeeDialog(
                null
            );
        },

        onEditEmployee: function (
            oEvent
        ) {
            this._employeeDialog(
                this._row(oEvent)
            );
        },

        _employeeDialog: function (
            oRecord
        ) {
            var oFirst =
                this._input(
                    "Text",
                    oRecord &&
                    oRecord.firstName
                );

            var oLast =
                this._input(
                    "Text",
                    oRecord &&
                    oRecord.lastName
                );

            var oEmail =
                this._input(
                    "Email",
                    oRecord &&
                    oRecord.email
                );

            var oJob =
                this._input(
                    "Text",
                    oRecord &&
                    oRecord.jobTitle
                );

            var oJoinDate =
                this._date(
                    oRecord &&
                    oRecord.joinDate
                );

            var oRate =
                this._input(
                    "Number",
                    oRecord
                        ? oRecord.hourlyRate
                        : 0
                );

            this._openDialog(
                oRecord
                    ? "Edit Employee"
                    : "Add Employee",

                [].concat(
                    this._field(
                        "First Name",
                        oFirst,
                        true
                    ),

                    this._field(
                        "Last Name",
                        oLast,
                        true
                    ),

                    this._field(
                        "Email",
                        oEmail,
                        true
                    ),

                    this._field(
                        "Job Title",
                        oJob,
                        false
                    ),

                    this._field(
                        "Join Date",
                        oJoinDate,
                        false
                    ),

                    this._field(
                        "Hourly Rate",
                        oRate,
                        false
                    )
                ),

                async function () {
                    var sFirst =
                        oFirst
                            .getValue()
                            .trim();

                    var sLast =
                        oLast
                            .getValue()
                            .trim();

                    var sEmail =
                        oEmail
                            .getValue()
                            .trim();

                    var nRate =
                        Number(
                            oRate
                                .getValue()
                        );

                    if (
                        !sFirst ||
                        !sLast ||
                        !sEmail
                    ) {
                        throw new Error(
                            "First Name, Last Name, and Email are mandatory."
                        );
                    }

                    if (
                        !sEmail.includes(
                            "@"
                        )
                    ) {
                        throw new Error(
                            "Enter a valid Email."
                        );
                    }

                    if (
                        !Number.isFinite(
                            nRate
                        ) ||
                        nRate < 0
                    ) {
                        throw new Error(
                            "Hourly Rate cannot be negative."
                        );
                    }

                    var oPayload = {
                        firstName:
                            sFirst,

                        lastName:
                            sLast,

                        email:
                            sEmail,

                        jobTitle:
                            oJob
                                .getValue()
                                .trim(),

                        joinDate:
                            oJoinDate
                                .getValue() ||
                            null,

                        hourlyRate:
                            nRate,

                        status:
                            oRecord
                                ? oRecord
                                    .status
                                : "Active"
                    };

                    if (oRecord) {
                        await this
                            ._update(
                                "Employees",
                                oRecord.ID,
                                oPayload
                            );
                    } else {
                        await this
                            ._create(
                                "Employees",
                                oPayload
                            );
                    }
                }.bind(this)
            );
        },

        onToggleEmployeeStatus:
            function (oEvent) {
                return this._toggle(
                    "Employees",
                    oEvent
                );
            },

        onDeleteEmployee:
            function (oEvent) {
                var oRecord =
                    this._row(oEvent);

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Employees",
                    oRecord,
                    oRecord
                        .employeeName
                );
            },

        onAddManager: function () {
            this._managerDialog(
                null
            );
        },

        onEditManager: function (
            oEvent
        ) {
            this._managerDialog(
                this._row(oEvent)
            );
        },

        _managerDialog: function (
            oRecord
        ) {
            var oAdmin =
                this
                    .getView()
                    .getModel(
                        "admin"
                    );

            var aManagers =
                oAdmin.getProperty(
                    "/managers"
                ) ||
                [];

            var aEmployees =
                oAdmin.getProperty(
                    "/employees"
                ) ||
                [];

            var mUsedEmployees =
                new Set(
                    aManagers
                        .filter(
                            function (
                                oManager
                            ) {
                                return (
                                    !oRecord ||
                                    oManager
                                        .ID !==
                                    oRecord
                                        .ID
                                );
                            }
                        )
                        .map(
                            function (
                                oManager
                            ) {
                                return oManager
                                    .employeeID;
                            }
                        )
                );

            var aEligibleEmployees =
                aEmployees.filter(
                    function (
                        oEmployee
                    ) {
                        return (
                            (
                                oEmployee
                                    .status ===
                                    "Active" ||
                                (
                                    oRecord &&
                                    oEmployee
                                        .ID ===
                                    oRecord
                                        .employeeID
                                )
                            ) &&
                            !mUsedEmployees.has(
                                oEmployee.ID
                            )
                        );
                    }
                );

            if (
                !aEligibleEmployees
                    .length
            ) {
                MessageBox.warning(
                    "No eligible Employee is available."
                );

                return;
            }

            var oEmployee =
                this._select(
                    aEligibleEmployees,
                    "employeeName",
                    oRecord &&
                    oRecord.employeeID,
                    false
                );

            var oLevel =
                new Select({
                    width: "100%",

                    items: [
                        new Item({
                            key: "L1",
                            text: "L1"
                        }),

                        new Item({
                            key: "L2",
                            text: "L2"
                        }),

                        new Item({
                            key: "L3",
                            text: "L3"
                        }),

                        new Item({
                            key:
                                "DeliveryManager",

                            text:
                                "Delivery Manager"
                        })
                    ]
                });

            oLevel.setSelectedKey(
                oRecord &&
                oRecord.managerLevel
                    ? oRecord
                        .managerLevel
                    : "L1"
            );

            this._openDialog(
                oRecord
                    ? "Edit Manager"
                    : "Add Manager",

                [].concat(
                    this._field(
                        "Employee",
                        oEmployee,
                        true
                    ),

                    this._field(
                        "Manager Level",
                        oLevel,
                        true
                    )
                ),

                async function () {
                    var oPayload = {
                        employee_ID:
                            oEmployee
                                .getSelectedKey(),

                        managerLevel:
                            oLevel
                                .getSelectedKey(),

                        status:
                            oRecord
                                ? oRecord
                                    .status
                                : "Active"
                    };

                    if (oRecord) {
                        await this
                            ._update(
                                "Managers",
                                oRecord.ID,
                                oPayload
                            );
                    } else {
                        await this
                            ._create(
                                "Managers",
                                oPayload
                            );
                    }
                }.bind(this)
            );
        },

        onToggleManagerStatus:
            function (oEvent) {
                return this._toggle(
                    "Managers",
                    oEvent
                );
            },

        onDeleteManager:
            function (oEvent) {
                var oRecord =
                    this._row(oEvent);

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Managers",
                    oRecord,
                    oRecord
                        .managerName
                );
            },

        onAddClient: function () {
            this._clientDialog(
                null
            );
        },

        onEditClient: function (
            oEvent
        ) {
            this._clientDialog(
                this._row(oEvent)
            );
        },

        _clientDialog: function (
    oRecord
) {
    var oName =
        this._input(
            "Text",
            oRecord &&
            oRecord.clientName
        );

    var oContact =
        this._input(
            "Text",
            oRecord &&
            oRecord.contactPerson
        );

    var oEmail =
        this._input(
            "Email",
            oRecord &&
            oRecord.email
        );

    var oPhone =
        this._input(
            "Text",
            oRecord &&
            oRecord.phone
        );

    var oCountry =
        this._input(
            "Text",
            oRecord &&
            oRecord.country
        );

    var oIndustry =
        this._input(
            "Text",
            oRecord &&
            oRecord.industry
        );

    this._openDialog(
        oRecord
            ? "Edit Client"
            : "Add Client",

        [].concat(
            this._field(
                "Client Name",
                oName,
                true
            ),

            this._field(
                "Contact Person",
                oContact,
                false
            ),

            this._field(
                "Contact Email",
                oEmail,
                false
            ),

            this._field(
                "Phone",
                oPhone,
                false
            ),

            this._field(
                "Country",
                oCountry,
                false
            ),

            this._field(
                "Industry",
                oIndustry,
                false
            )
        ),

        async function () {
            var sName =
                oName
                    .getValue()
                    .trim();

            var sContact =
                oContact
                    .getValue()
                    .trim();

            var sEmail =
                oEmail
                    .getValue()
                    .trim();

            var sPhone =
                oPhone
                    .getValue()
                    .trim();

            var sCountry =
                oCountry
                    .getValue()
                    .trim();

            var sIndustry =
                oIndustry
                    .getValue()
                    .trim();

            if (!sName) {
                oName.setValueState(
                    "Error"
                );

                oName.setValueStateText(
                    "Client Name is mandatory."
                );

                throw new Error(
                    "Client Name is mandatory."
                );
            }

            oName.setValueState(
                "None"
            );

            if (
                sEmail &&
                !sEmail.includes("@")
            ) {
                oEmail.setValueState(
                    "Error"
                );

                oEmail.setValueStateText(
                    "Enter a valid Contact Email."
                );

                throw new Error(
                    "Enter a valid Contact Email."
                );
            }

            oEmail.setValueState(
                "None"
            );

            /*
             * These names exactly match the Clients entity
             * used by cat-service.js.
             */
            var oPayload = {
                clientName:
                    sName,

                contactPerson:
                    sContact,

                email:
                    sEmail,

                phoneNumber:
                    sPhone,

                country:
                    sCountry,

                industry:
                    sIndustry,

                status:
                    oRecord
                        ? oRecord.status
                        : "Active"
            };

            console.log(
                "Saving Client payload:",
                oPayload
            );

            if (oRecord) {
                await this._update(
                    "Clients",
                    oRecord.ID,
                    oPayload
                );
            } else {
                await this._create(
                    "Clients",
                    oPayload
                );
            }
        }.bind(this)
    );
},
        onToggleClientStatus:
            function (oEvent) {
                return this._toggle(
                    "Clients",
                    oEvent
                );
            },

        onDeleteClient:
            function (oEvent) {
                var oRecord =
                    this._row(oEvent);

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Clients",
                    oRecord,
                    oRecord
                        .clientName ||
                    oRecord.name ||
                    "Client"
                );
            },

        onAddProject: function () {
            this._projectDialog(
                null
            );
        },

        onEditProject: function (
            oEvent
        ) {
            this._projectDialog(
                this._row(oEvent)
            );
        },

        _projectDialog: function (
            oRecord
        ) {
            var oAdmin =
                this
                    .getView()
                    .getModel(
                        "admin"
                    );

            var aClients =
                (
                    oAdmin.getProperty(
                        "/clients"
                    ) ||
                    []
                ).filter(
                    function (
                        oClient
                    ) {
                        return (
                            oClient
                                .status ===
                                "Active" ||
                            (
                                oRecord &&
                                oClient.ID ===
                                oRecord
                                    .clientID
                            )
                        );
                    }
                );

            var aManagers =
                (
                    oAdmin.getProperty(
                        "/managers"
                    ) ||
                    []
                ).filter(
                    function (
                        oManager
                    ) {
                        return (
                            oManager
                                .status ===
                                "Active" ||
                            (
                                oRecord &&
                                oManager.ID ===
                                oRecord
                                    .managerID
                            )
                        );
                    }
                );

            if (
                !aClients.length ||
                !aManagers.length
            ) {
                MessageBox.warning(
                    "Create an active Client and Manager first."
                );

                return;
            }

            var oCode =
                this._input(
                    "Text",
                    oRecord &&
                    oRecord.projectCode
                );

            var oName =
                this._input(
                    "Text",
                    oRecord &&
                    oRecord.projectName
                );

            var oClient =
                this._select(
                    aClients,
                    "clientName",
                    oRecord &&
                    oRecord.clientID,
                    false
                );

            var oManager =
                this._select(
                    aManagers,
                    "managerName",
                    oRecord &&
                    oRecord.managerID,
                    false
                );

            var oBilling =
                new Select({
                    width: "100%",

                    items: [
                        new Item({
                            key: "T&M",
                            text:
                                "Time and Material"
                        }),

                        new Item({
                            key:
                                "FixedPrice",

                            text:
                                "Fixed Price"
                        }),

                        new Item({
                            key:
                                "ResourceBased",

                            text:
                                "Resource Based"
                        })
                    ]
                });

            oBilling.setSelectedKey(
                oRecord &&
                oRecord.billingType
                    ? oRecord
                        .billingType
                    : "T&M"
            );

            var oStart =
                this._date(
                    oRecord &&
                    oRecord.startDate
                );

            var oEnd =
                this._date(
                    oRecord &&
                    oRecord.endDate
                );

            var oHours =
                this._input(
                    "Number",
                    oRecord
                        ? oRecord
                            .plannedHours
                        : ""
                );

            var oStatus =
                new Select({
                    width: "100%",

                    items: [
                        new Item({
                            key: "Draft",
                            text: "Draft"
                        }),

                        new Item({
                            key: "Active",
                            text: "Active"
                        }),

                        new Item({
                            key: "OnHold",
                            text: "On Hold"
                        }),

                        new Item({
                            key:
                                "Completed",

                            text:
                                "Completed"
                        }),

                        new Item({
                            key:
                                "Cancelled",

                            text:
                                "Cancelled"
                        })
                    ]
                });

            oStatus.setSelectedKey(
                oRecord &&
                oRecord.status
                    ? oRecord.status
                    : "Active"
            );

            this._openDialog(
                oRecord
                    ? "Edit Project"
                    : "Add Project",

                [].concat(
                    this._field(
                        "Project Code",
                        oCode,
                        true
                    ),

                    this._field(
                        "Project Name",
                        oName,
                        true
                    ),

                    this._field(
                        "Client",
                        oClient,
                        true
                    ),

                    this._field(
                        "Manager",
                        oManager,
                        true
                    ),

                    this._field(
                        "Billing Type",
                        oBilling,
                        true
                    ),

                    this._field(
                        "Start Date",
                        oStart,
                        false
                    ),

                    this._field(
                        "End Date",
                        oEnd,
                        false
                    ),

                    this._field(
                        "Allocated Hours",
                        oHours,
                        true
                    ),

                    this._field(
                        "Status",
                        oStatus,
                        true
                    )
                ),

                async function () {
                    var sCode =
                        oCode
                            .getValue()
                            .trim();

                    var sName =
                        oName
                            .getValue()
                            .trim();

                    var nHours =
                        Number(
                            oHours
                                .getValue()
                        );

                    if (
                        !sCode ||
                        !sName ||
                        !oClient
                            .getSelectedKey() ||
                        !oManager
                            .getSelectedKey()
                    ) {
                        throw new Error(
                            "Project Code, Name, Client, and Manager are mandatory."
                        );
                    }

                    if (
                        !Number.isFinite(
                            nHours
                        ) ||
                        nHours <= 0
                    ) {
                        throw new Error(
                            "Allocated Hours must be greater than zero."
                        );
                    }

                    if (
                        oStart.getValue() &&
                        oEnd.getValue() &&
                        oEnd.getValue() <
                        oStart.getValue()
                    ) {
                        throw new Error(
                            "End Date cannot be before Start Date."
                        );
                    }

                    var oPayload = {
                        projectCode:
                            sCode,

                        projectName:
                            sName,

                        client_ID:
                            oClient
                                .getSelectedKey(),

                        manager_ID:
                            oManager
                                .getSelectedKey(),

                        billingType:
                            oBilling
                                .getSelectedKey(),

                        startDate:
                            oStart
                                .getValue() ||
                            null,

                        endDate:
                            oEnd
                                .getValue() ||
                            null,

                        plannedHours:
                            nHours,

                        consumedHours:
                            oRecord
                                ? oRecord
                                    .consumedHours
                                : 0,

                        status:
                            oStatus
                                .getSelectedKey()
                    };

                    if (oRecord) {
                        await this
                            ._update(
                                "Projects",
                                oRecord.ID,
                                oPayload
                            );
                    } else {
                        await this
                            ._create(
                                "Projects",
                                oPayload
                            );
                    }
                }.bind(this)
            );
        },

        onCancelProject:
            async function (
                oEvent
            ) {
                var oRecord =
                    this._row(oEvent);

                if (!oRecord) {
                    return;
                }

                await this._update(
                    "Projects",
                    oRecord.ID,
                    {
                        status:
                            "Cancelled"
                    }
                );

                await this
                    ._loadAdminDashboard();
            },

        onDeleteProject:
            function (oEvent) {
                var oRecord =
                    this._row(oEvent);

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Projects",
                    oRecord,
                    oRecord
                        .projectCode
                );
            },

        onAddBudget: function () {
            this._budgetDialog(
                null
            );
        },

        onEditBudget: function (
            oEvent
        ) {
            this._budgetDialog(
                this._row(oEvent)
            );
        },

        _budgetDialog: function (
            oRecord
        ) {
            var aProjects =
                (
                    this
                        .getView()
                        .getModel(
                            "admin"
                        )
                        .getProperty(
                            "/projects"
                        ) ||
                    []
                ).filter(
                    function (
                        oProject
                    ) {
                        return oRecord
                            ? oProject.ID ===
                                oRecord
                                    .projectID
                            : (
                                !oProject
                                    .hasBudget &&
                                oProject
                                    .status !==
                                    "Cancelled"
                            );
                    }
                );

            if (
                !aProjects.length
            ) {
                MessageBox.information(
                    "Every available Project already has a Budget."
                );

                return;
            }

            var oProject =
                this._select(
                    aProjects,
                    "displayName",
                    oRecord &&
                    oRecord.projectID,
                    false
                );

            oProject.setEnabled(
                !oRecord
            );

            var oAmount =
                this._input(
                    "Number",
                    oRecord
                        ? oRecord
                            .budgetAmount
                        : ""
                );

            var oRate =
                this._input(
                    "Number",
                    oRecord
                        ? oRecord
                            .billingRateHr
                        : ""
                );

            var oCurrency =
                new Select({
                    width: "100%",

                    items: [
                        new Item({
                            key: "USD",
                            text: "USD"
                        }),

                        new Item({
                            key: "INR",
                            text: "INR"
                        }),

                        new Item({
                            key: "EUR",
                            text: "EUR"
                        }),

                        new Item({
                            key: "GBP",
                            text: "GBP"
                        })
                    ]
                });

            oCurrency.setSelectedKey(
                oRecord &&
                oRecord.currencyCode
                    ? oRecord
                        .currencyCode
                    : "USD"
            );

            var oStatus =
                new Select({
                    width: "100%",

                    items: [
                        new Item({
                            key:
                                "WithinBudget",

                            text:
                                "Within Budget"
                        }),

                        new Item({
                            key: "AtRisk",
                            text:
                                "At Risk"
                        }),

                        new Item({
                            key:
                                "Breached",

                            text:
                                "Breached"
                        })
                    ]
                });

            oStatus.setSelectedKey(
                oRecord &&
                oRecord.budgetStatus
                    ? oRecord
                        .budgetStatus
                    : "WithinBudget"
            );

            this._openDialog(
                oRecord
                    ? "Edit Budget"
                    : "Add Budget",

                [].concat(
                    this._field(
                        "Project",
                        oProject,
                        true
                    ),

                    this._field(
                        "Budget Allocated",
                        oAmount,
                        true
                    ),

                    this._field(
                        "Rate per Hour",
                        oRate,
                        true
                    ),

                    this._field(
                        "Currency",
                        oCurrency,
                        true
                    ),

                    this._field(
                        "Budget Status",
                        oStatus,
                        true
                    )
                ),

                async function () {
                    var nAmount =
                        Number(
                            oAmount
                                .getValue()
                        );

                    var nRate =
                        Number(
                            oRate
                                .getValue()
                        );

                    if (
                        !Number.isFinite(
                            nAmount
                        ) ||
                        nAmount <= 0 ||
                        !Number.isFinite(
                            nRate
                        ) ||
                        nRate <= 0
                    ) {
                        throw new Error(
                            "Budget and Rate must be greater than zero."
                        );
                    }

                    var nConsumed =
                        oRecord
                            ? oRecord
                                .consumedAmount
                            : 0;

                    var oPayload = {
                        project_ID:
                            oProject
                                .getSelectedKey(),

                        budgetAmount:
                            nAmount,

                        consumedAmount:
                            nConsumed,

                        remainingAmount:
                            Math.max(
                                nAmount -
                                nConsumed,
                                0
                            ),

                        billingRateHr:
                            nRate,

                        currencyCode:
                            oCurrency
                                .getSelectedKey(),

                        budgetStatus:
                            oStatus
                                .getSelectedKey()
                    };

                    if (oRecord) {
                        await this
                            ._update(
                                "Budgets",
                                oRecord.ID,
                                oPayload
                            );
                    } else {
                        await this
                            ._create(
                                "Budgets",
                                oPayload
                            );
                    }
                }.bind(this)
            );
        },

        onDeleteBudget:
            function (oEvent) {
                var oRecord =
                    this._row(oEvent);

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Budgets",
                    oRecord,
                    oRecord
                        .projectName +
                    " Budget"
                );
            },

        onAddMilestone:
            function () {
                this._milestoneDialog(
                    null
                );
            },

        onEditMilestone:
            function (oEvent) {
                this._milestoneDialog(
                    this._row(
                        oEvent
                    )
                );
            },

        _milestoneDialog:
            function (oRecord) {
                var aProjects =
                    (
                        this
                            .getView()
                            .getModel(
                                "admin"
                            )
                            .getProperty(
                                "/projects"
                            ) ||
                        []
                    ).filter(
                        function (
                            oProject
                        ) {
                            return (
                                oProject
                                    .status !==
                                    "Cancelled" ||
                                (
                                    oRecord &&
                                    oProject
                                        .ID ===
                                    oRecord
                                        .projectID
                                )
                            );
                        }
                    );

                if (
                    !aProjects.length
                ) {
                    MessageBox.warning(
                        "Create a Project first."
                    );

                    return;
                }

                var oProject =
                    this._select(
                        aProjects,
                        "displayName",
                        oRecord &&
                        oRecord
                            .projectID,
                        false
                    );

                var oName =
                    this._input(
                        "Text",
                        oRecord &&
                        oRecord
                            .milestoneName
                    );

                var oStart =
                    this._date(
                        oRecord &&
                        oRecord
                            .startDate
                    );

                var oEnd =
                    this._date(
                        oRecord &&
                        oRecord
                            .endDate
                    );

                var oPercent =
                    this._input(
                        "Number",
                        oRecord
                            ? oRecord
                                .completionPercent
                            : 0
                    );

                var oStatus =
                    new Select({
                        width:
                            "100%",

                        items: [
                            new Item({
                                key:
                                    "NotStarted",

                                text:
                                    "Not Started"
                            }),

                            new Item({
                                key:
                                    "InProgress",

                                text:
                                    "In Progress"
                            }),

                            new Item({
                                key:
                                    "Completed",

                                text:
                                    "Completed"
                            }),

                            new Item({
                                key:
                                    "Delayed",

                                text:
                                    "Delayed"
                            })
                        ]
                    });

                oStatus.setSelectedKey(
                    oRecord &&
                    oRecord.status
                        ? oRecord
                            .status
                        : "NotStarted"
                );

                this._openDialog(
                    oRecord
                        ? "Edit Milestone"
                        : "Add Milestone",

                    [].concat(
                        this._field(
                            "Project",
                            oProject,
                            true
                        ),

                        this._field(
                            "Milestone Name",
                            oName,
                            true
                        ),

                        this._field(
                            "Start Date",
                            oStart,
                            false
                        ),

                        this._field(
                            "End Date",
                            oEnd,
                            false
                        ),

                        this._field(
                            "Completion Percentage",
                            oPercent,
                            false
                        ),

                        this._field(
                            "Status",
                            oStatus,
                            true
                        )
                    ),

                    async function () {
                        var sName =
                            oName
                                .getValue()
                                .trim();

                        var nPercent =
                            Number(
                                oPercent
                                    .getValue()
                            );

                        if (!sName) {
                            throw new Error(
                                "Milestone Name is mandatory."
                            );
                        }

                        if (
                            !Number.isFinite(
                                nPercent
                            ) ||
                            nPercent < 0 ||
                            nPercent > 100
                        ) {
                            throw new Error(
                                "Completion must be between 0 and 100."
                            );
                        }

                        if (
                            oStart
                                .getValue() &&
                            oEnd
                                .getValue() &&
                            oEnd
                                .getValue() <
                            oStart
                                .getValue()
                        ) {
                            throw new Error(
                                "End Date cannot be before Start Date."
                            );
                        }

                        var oPayload = {
                            project_ID:
                                oProject
                                    .getSelectedKey(),

                            milestoneName:
                                sName,

                            startDate:
                                oStart
                                    .getValue() ||
                                null,

                            endDate:
                                oEnd
                                    .getValue() ||
                                null,

                            completionPercent:
                                nPercent,

                            status:
                                oStatus
                                    .getSelectedKey()
                        };

                        if (oRecord) {
                            await this
                                ._update(
                                    "Milestones",
                                    oRecord.ID,
                                    oPayload
                                );
                        } else {
                            await this
                                ._create(
                                    "Milestones",
                                    oPayload
                                );
                        }
                    }.bind(this)
                );
            },

        onCompleteMilestone:
            async function (
                oEvent
            ) {
                var oRecord =
                    this._row(
                        oEvent
                    );

                if (!oRecord) {
                    return;
                }

                await this._update(
                    "Milestones",
                    oRecord.ID,
                    {
                        status:
                            "Completed",

                        completionPercent:
                            100
                    }
                );

                await this
                    ._loadAdminDashboard();
            },

        onDeleteMilestone:
            function (oEvent) {
                var oRecord =
                    this._row(
                        oEvent
                    );

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Milestones",
                    oRecord,
                    oRecord
                        .milestoneName
                );
            },

        onAssignEmployeeTask:
            function () {
                this._taskDialog(
                    null
                );
            },

        onEditTask:
            function (oEvent) {
                this._taskDialog(
                    this._row(
                        oEvent
                    )
                );
            },

        _taskDialog:
            function (oRecord) {
                var oAdmin =
                    this
                        .getView()
                        .getModel(
                            "admin"
                        );

                var aEmployees =
                    (
                        oAdmin.getProperty(
                            "/employees"
                        ) ||
                        []
                    ).filter(
                        function (
                            oEmployee
                        ) {
                            return (
                                oEmployee
                                    .status ===
                                    "Active" ||
                                (
                                    oRecord &&
                                    oEmployee
                                        .ID ===
                                    oRecord
                                        .employeeID
                                )
                            );
                        }
                    );

                var aProjects =
                    (
                        oAdmin.getProperty(
                            "/projects"
                        ) ||
                        []
                    ).filter(
                        function (
                            oProject
                        ) {
                            return (
                                oProject
                                    .status ===
                                    "Active" ||
                                (
                                    oRecord &&
                                    oProject
                                        .ID ===
                                    oRecord
                                        .projectID
                                )
                            );
                        }
                    );

                var aMilestones =
                    oAdmin.getProperty(
                        "/milestones"
                    ) ||
                    [];

                if (
                    !aEmployees.length ||
                    !aProjects.length
                ) {
                    MessageBox.warning(
                        "Active Employee and Project are required."
                    );

                    return;
                }

                var oEmployee =
                    this._select(
                        aEmployees,
                        "employeeName",
                        oRecord &&
                        oRecord
                            .employeeID,
                        false
                    );

                var oProject =
                    this._select(
                        aProjects,
                        "displayName",
                        oRecord &&
                        oRecord
                            .projectID,
                        false
                    );

                var oMilestone =
                    new Select({
                        width:
                            "100%"
                    });

                var oName =
                    this._input(
                        "Text",
                        oRecord &&
                        oRecord
                            .taskName
                    );

                var oStart =
                    this._date(
                        oRecord &&
                        oRecord
                            .startDate
                    );

                var oEnd =
                    this._date(
                        oRecord &&
                        oRecord
                            .endDate
                    );

                var oHours =
                    this._input(
                        "Number",
                        oRecord
                            ? oRecord
                                .estimatedHours
                            : ""
                    );

                var oStatus =
                    new Select({
                        width:
                            "100%",

                        items: [
                            new Item({
                                key:
                                    "NotStarted",

                                text:
                                    "Not Started"
                            }),

                            new Item({
                                key:
                                    "InProgress",

                                text:
                                    "In Progress"
                            }),

                            new Item({
                                key:
                                    "Blocked",

                                text:
                                    "Blocked"
                            }),

                            new Item({
                                key:
                                    "Completed",

                                text:
                                    "Completed"
                            })
                        ]
                    });

                oStatus.setSelectedKey(
                    oRecord &&
                    oRecord.status
                        ? oRecord
                            .status
                        : "InProgress"
                );

                var fnLoadMilestones =
                    function () {
                        var sProjectID =
                            oProject
                                .getSelectedKey();

                        oMilestone
                            .removeAllItems();

                        var aMatches =
                            aMilestones
                                .filter(
                                    function (
                                        oItem
                                    ) {
                                        return (
                                            oItem
                                                .projectID ===
                                            sProjectID
                                        );
                                    }
                                );

                        aMatches.forEach(
                            function (
                                oItem
                            ) {
                                oMilestone
                                    .addItem(
                                        new Item({
                                            key:
                                                oItem.ID,

                                            text:
                                                oItem
                                                    .milestoneName +
                                                " (" +
                                                oItem
                                                    .status +
                                                ")"
                                        })
                                    );
                            }
                        );

                        oMilestone.setEnabled(
                            Boolean(
                                aMatches
                                    .length
                            )
                        );

                        if (
                            aMatches.length
                        ) {
                            oMilestone
                                .setSelectedKey(
                                    (
                                        oRecord &&
                                        aMatches
                                            .some(
                                                function (
                                                    oItem
                                                ) {
                                                    return (
                                                        oItem
                                                            .ID ===
                                                        oRecord
                                                            .milestoneID
                                                    );
                                                }
                                            )
                                    )
                                        ? oRecord
                                            .milestoneID
                                        : aMatches[0]
                                            .ID
                                );
                        }
                    };

                oProject.attachChange(
                    fnLoadMilestones
                );

                fnLoadMilestones();

                this._openDialog(
                    oRecord
                        ? "Edit Task Assignment"
                        : "Assign Employee Task",

                    [].concat(
                        this._field(
                            "Employee",
                            oEmployee,
                            true
                        ),

                        this._field(
                            "Project",
                            oProject,
                            true
                        ),

                        this._field(
                            "Milestone",
                            oMilestone,
                            true
                        ),

                        this._field(
                            "Task Name",
                            oName,
                            true
                        ),

                        this._field(
                            "Start Date",
                            oStart,
                            false
                        ),

                        this._field(
                            "End Date",
                            oEnd,
                            false
                        ),

                        this._field(
                            "Estimated Hours",
                            oHours,
                            true
                        ),

                        this._field(
                            "Status",
                            oStatus,
                            true
                        )
                    ),

                    async function () {
                        var sEmployeeID =
                            oEmployee
                                .getSelectedKey();

                        var sMilestoneID =
                            oMilestone
                                .getSelectedKey();

                        var sName =
                            oName
                                .getValue()
                                .trim();

                        var nHours =
                            Number(
                                oHours
                                    .getValue()
                            );

                        if (
                            !sEmployeeID ||
                            !sMilestoneID ||
                            !sName
                        ) {
                            throw new Error(
                                "Employee, Milestone, and Task Name are mandatory."
                            );
                        }

                        if (
                            !Number.isFinite(
                                nHours
                            ) ||
                            nHours <= 0
                        ) {
                            throw new Error(
                                "Estimated Hours must be greater than zero."
                            );
                        }

                        if (
                            oStart
                                .getValue() &&
                            oEnd
                                .getValue() &&
                            oEnd
                                .getValue() <
                            oStart
                                .getValue()
                        ) {
                            throw new Error(
                                "End Date cannot be before Start Date."
                            );
                        }

                        var oPayload = {
                            milestone_ID:
                                sMilestoneID,

                            taskName:
                                "[" +
                                sEmployeeID +
                                "] " +
                                sName,

                            startDate:
                                oStart
                                    .getValue() ||
                                null,

                            endDate:
                                oEnd
                                    .getValue() ||
                                null,

                            estimatedHours:
                                nHours,

                            actualHours:
                                oRecord
                                    ? oRecord
                                        .actualHours
                                    : 0,

                            status:
                                oStatus
                                    .getSelectedKey()
                        };

                        if (oRecord) {
                            await this
                                ._update(
                                    "Tasks",
                                    oRecord.ID,
                                    oPayload
                                );
                        } else {
                            await this
                                ._create(
                                    "Tasks",
                                    oPayload
                                );
                        }
                    }.bind(this)
                );
            },

        onCompleteTask:
            async function (
                oEvent
            ) {
                var oRecord =
                    this._row(
                        oEvent
                    );

                if (!oRecord) {
                    return;
                }

                await this._update(
                    "Tasks",
                    oRecord.ID,
                    {
                        status:
                            "Completed"
                    }
                );

                await this
                    ._loadAdminDashboard();
            },

        onDeleteTask:
            function (oEvent) {
                var oRecord =
                    this._row(
                        oEvent
                    );

                if (!oRecord) {
                    return;
                }

                this._confirmDelete(
                    "Tasks",
                    oRecord,
                    oRecord.taskName
                );
            },

        onConfirmPayment:
            function (oEvent) {
                var oButton =
                    oEvent.getSource();

                var oInvoice =
                    this._row(
                        oEvent
                    );

                if (
                    !oInvoice ||
                    !oInvoice.ID
                ) {
                    MessageBox.error(
                        "Invoice ID is unavailable."
                    );

                    return;
                }

                MessageBox.confirm(
                    "Confirm payment for Invoice " +
                    oInvoice
                        .invoiceNumber +
                    "?",
                    {
                        title:
                            "Confirm Payment",

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
                                    oButton.setBusy(
                                        true
                                    );

                                    await this
                                        ._boundAction(
                                            "Invoices",
                                            oInvoice.ID,
                                            "markPaid"
                                        );

                                    await this
                                        ._loadAdminDashboard();

                                    MessageToast.show(
                                        "Payment confirmed"
                                    );

                                } catch (oError) {
                                    MessageBox.error(
                                        this._error(
                                            oError,
                                            "Payment confirmation failed."
                                        )
                                    );

                                } finally {
                                    oButton.setBusy(
                                        false
                                    );
                                }
                            }.bind(this)
                    }
                );
            },

        onSearchInvoices: function (oEvent) {
            var sQuery = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oTable = this.byId("invoicesTable");
            var oBinding = oTable ? oTable.getBinding("items") : null;
            if (!oBinding) {
                return;
            }

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("invoiceNumber", FilterOperator.Contains, sQuery),
                new Filter("clientName", FilterOperator.Contains, sQuery),
                new Filter("projectName", FilterOperator.Contains, sQuery),
                new Filter("projectCode", FilterOperator.Contains, sQuery),
                new Filter("status", FilterOperator.Contains, sQuery),
                new Filter("paymentStatus", FilterOperator.Contains, sQuery)
            ];

            oBinding.filter([new Filter({
                filters: aFilters,
                and: false
            })]);
        },

        onOpenGenerateInvoiceDialog: function () {
            var aProjects = this.getView().getModel("admin").getProperty("/projects") || [];
            var aEligibleProjects = aProjects.filter(function (oProj) {
                return oProj.hasBudget && oProj.status !== "Cancelled";
            });

            if (!aEligibleProjects.length) {
                aEligibleProjects = aProjects;
            }

            if (!aEligibleProjects.length) {
                MessageBox.warning("No projects available to generate an invoice.");
                return;
            }

            var oProjectSelect = this._select(aEligibleProjects, "displayName", aEligibleProjects[0].ID, false);

            this._openDialog(
                "Generate Invoice from Approved Timesheets",
                [
                    new Label({ text: "Project (must have approved un-invoiced hours)", required: true }),
                    oProjectSelect
                ],
                async function () {
                    var sProjectID = oProjectSelect.getSelectedKey();
                    if (!sProjectID) {
                        throw new Error("Please select a project.");
                    }

                    await this._boundAction("Projects", sProjectID, "generateInvoice");
                }.bind(this)
            );
        },

        onIssueInvoice: function (oEvent) {
            var oButton = oEvent.getSource();
            var oInvoice = this._row(oEvent);

            if (!oInvoice || !oInvoice.ID) {
                MessageBox.error("Invoice ID is unavailable.");
                return;
            }

            MessageBox.confirm(
                "Issue Invoice " + (oInvoice.invoiceNumber || oInvoice.ID) + "?",
                {
                    title: "Issue Invoice",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: async function (sAction) {
                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }

                        try {
                            oButton.setBusy(true);
                            await this._boundAction("Invoices", oInvoice.ID, "issue");
                            await this._loadAdminDashboard();
                            MessageToast.show("Invoice issued successfully.");
                        } catch (oError) {
                            MessageBox.error(this._error(oError, "Failed to issue invoice."));
                        } finally {
                            oButton.setBusy(false);
                        }
                    }.bind(this)
                }
            );
        },

        onViewInvoiceDetails: function (oEvent) {
            var oInvoice = this._row(oEvent);
            if (!oInvoice) {
                MessageBox.error("Invoice details are unavailable.");
                return;
            }

            var sCurrency = oInvoice.currencyCode || "USD";

            var oDialog = new Dialog({
                title: "Invoice Details - " + (oInvoice.invoiceNumber || oInvoice.ID),
                contentWidth: "28rem",
                verticalScrolling: true,
                content: [
                    new VBox({
                        items: [
                            new Label({ text: "Invoice Number", design: "Bold" }),
                            new Input({ value: oInvoice.invoiceNumber || "", editable: false }),
                            new Label({ text: "Client", design: "Bold" }),
                            new Input({ value: oInvoice.clientName || "", editable: false }),
                            new Label({ text: "Project", design: "Bold" }),
                            new Input({ value: oInvoice.projectName || oInvoice.projectCode || "", editable: false }),
                            new Label({ text: "Invoice Date", design: "Bold" }),
                            new Input({ value: oInvoice.invoiceDate || "", editable: false }),
                            new Label({ text: "Due Date", design: "Bold" }),
                            new Input({ value: oInvoice.dueDate || "", editable: false }),
                            new Label({ text: "Billable Hours", design: "Bold" }),
                            new Input({ value: String(oInvoice.billableHours || 0), editable: false }),
                            new Label({ text: "Subtotal", design: "Bold" }),
                            new Input({ value: sCurrency + " " + Number(oInvoice.subtotal || 0).toFixed(2), editable: false }),
                            new Label({ text: "Tax (18%)", design: "Bold" }),
                            new Input({ value: sCurrency + " " + Number(oInvoice.taxAmount || 0).toFixed(2), editable: false }),
                            new Label({ text: "Payable Amount", design: "Bold" }),
                            new Input({ value: sCurrency + " " + Number(oInvoice.payableAmount || 0).toFixed(2), editable: false }),
                            new Label({ text: "Status", design: "Bold" }),
                            new Input({ value: oInvoice.status || "", editable: false }),
                            new Label({ text: "Payment Status", design: "Bold" }),
                            new Input({ value: oInvoice.paymentStatus || "", editable: false })
                        ]
                    }).addStyleClass("sapUiSmallMargin")
                ],
                endButton: new Button({
                    text: "Close",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }
    });
});