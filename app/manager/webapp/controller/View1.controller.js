sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Select",
    "sap/m/TextArea",
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
    Select,
    TextArea,
    Button,
    Item
) {
    "use strict";

    return Controller.extend("manager.controller.View1", {
        onInit: function () {
            this._managerID = "";
            this._managerSelectionDialog = null;
            this._managerSelectorOpening = false;

            var oDashboardModel = new JSONModel({
                managerID: "",
                managerName: "",

                activeProjects: 0,
                pendingApprovals: 0,
                paidInvoices: 0,
                atRiskBudgets: 0,

                overallCompletion: 0,
                overallCompletionDisplay: "0%",
                overallCompletionState: "Information",

                approvals: [],
                projects: [],
                invoices: [],
                teamMembers: [],
                teamCount: 0
            });

            oDashboardModel.setSizeLimit(1000);

            this.getView().setModel(
                oDashboardModel,
                "dashboard"
            );

            setTimeout(
                function () {
                    if (
                        !this._getManagerID() &&
                        !this._managerSelectorOpening &&
                        !this._managerSelectionDialog
                    ) {
                        this._openManagerSelectionDialog();
                    }
                }.bind(this),
                0
            );
        },

        /* ========================================================== */
        /* MANAGER SELECTION                                          */
        /* ========================================================== */

        _getManagerID: function () {
            return this._managerID || "";
        },

        _setManagerID: function (sManagerID) {
            this._managerID = sManagerID || "";

            var oDashboardModel = this
                .getView()
                .getModel("dashboard");

            if (oDashboardModel) {
                oDashboardModel.setProperty(
                    "/managerID",
                    this._managerID
                );
            }
        },

        _resetDashboardData: function () {
            this.getView()
                .getModel("dashboard")
                .setData({
                    managerID: "",
                    managerName: "",

                    activeProjects: 0,
                    pendingApprovals: 0,
                    paidInvoices: 0,
                    atRiskBudgets: 0,

                    overallCompletion: 0,
                    overallCompletionDisplay: "0%",
                    overallCompletionState:
                        "Information",

                    approvals: [],
                    projects: [],
                    invoices: [],
                    teamMembers: [],
                    teamCount: 0
                });
        },

        _loadManagerOptions: async function () {
            var oODataModel = this
                .getOwnerComponent()
                .getModel();

            if (!oODataModel) {
                throw new Error(
                    "OData model is unavailable."
                );
            }

            var aResults = await Promise.all([
                this._requestObjects(
                    oODataModel,
                    "/Managers"
                ),
                this._requestObjects(
                    oODataModel,
                    "/Employees"
                )
            ]);

            var aManagers = aResults[0];
            var aEmployees = aResults[1];
            var mEmployees = new Map();

            aEmployees.forEach(function (oEmployee) {
                mEmployees.set(
                    oEmployee.ID,
                    oEmployee
                );
            });

            return aManagers
                .filter(function (oManager) {
                    return (
                        !oManager.status ||
                        oManager.status === "Active"
                    );
                })
                .map(function (oManager) {
                    var oEmployee = mEmployees.get(
                        oManager.employee_ID
                    ) || {};

                    var sManagerName = [
                        oEmployee.firstName,
                        oEmployee.lastName
                    ]
                        .filter(Boolean)
                        .join(" ") ||
                        oEmployee.email ||
                        "Manager";

                    return {
                        ID: oManager.ID,
                        employeeID:
                            oManager.employee_ID || "",
                        managerName: sManagerName,
                        managerLevel:
                            oManager.managerLevel || "",
                        email: oEmployee.email || ""
                    };
                })
                .sort(function (oFirst, oSecond) {
                    return String(
                        oFirst.managerName
                    ).localeCompare(
                        String(oSecond.managerName)
                    );
                });
        },

        _openManagerSelectionDialog:
            async function () {
                if (
                    this._managerSelectorOpening ||
                    this._managerSelectionDialog
                ) {
                    return;
                }

                this._managerSelectorOpening = true;

                var oView = this.getView();

                try {
                    oView.setBusy(true);

                    var aManagers =
                        await this._loadManagerOptions();

                    if (!aManagers.length) {
                        MessageBox.warning(
                            "No active Managers are available."
                        );
                        return;
                    }

                    if (this._getManagerID()) {
                        return;
                    }

                    var oManagerSelect =
                        new Select({
                            width: "100%"
                        });

                    oManagerSelect.addItem(
                        new Item({
                            key: "",
                            text: "Select Manager"
                        })
                    );

                    aManagers.forEach(
                        function (oManager) {
                            var sDisplayText =
                                oManager.managerName;

                            if (oManager.managerLevel) {
                                sDisplayText +=
                                    " (" +
                                    oManager.managerLevel +
                                    ")";
                            }

                            if (oManager.email) {
                                sDisplayText +=
                                    " - " +
                                    oManager.email;
                            }

                            oManagerSelect.addItem(
                                new Item({
                                    key: oManager.ID,
                                    text: sDisplayText
                                })
                            );
                        }
                    );

                    var oDialog = new Dialog({
                        title: "Select Manager",
                        contentWidth: "34rem",
                        busyIndicatorDelay: 0,

                        content: [
                            new VBox({
                                items: [
                                    new Label({
                                        text: "Manager",
                                        required: true,
                                        labelFor:
                                            oManagerSelect
                                    }),
                                    oManagerSelect
                                ]
                            }).addStyleClass(
                                "sapUiSmallMargin"
                            )
                        ],

                        beginButton: new Button({
                            text: "Open Dashboard",
                            type: "Emphasized",

                            press: async function () {
                                var sManagerID =
                                    oManagerSelect
                                        .getSelectedKey();

                                if (!sManagerID) {
                                    MessageBox.warning(
                                        "Select a Manager."
                                    );
                                    return;
                                }

                                var oSelectedManager =
                                    aManagers.find(
                                        function (oManager) {
                                            return (
                                                oManager.ID ===
                                                sManagerID
                                            );
                                        }
                                    );

                                var oOpenButton =
                                    oDialog
                                        .getBeginButton();

                                try {
                                    oDialog.setBusy(true);
                                    oOpenButton.setEnabled(
                                        false
                                    );

                                    this._setManagerID(
                                        sManagerID
                                    );

                                    this.getView()
                                        .getModel(
                                            "dashboard"
                                        )
                                        .setProperty(
                                            "/managerName",
                                            oSelectedManager
                                                ? oSelectedManager
                                                    .managerName
                                                : "Manager"
                                        );

                                    await this
                                        ._loadDashboardData();

                                    oDialog.close();
                                } catch (oError) {
                                    this._setManagerID("");

                                    MessageBox.error(
                                        this._getErrorMessage(
                                            oError,
                                            "Manager Dashboard could not be opened."
                                        )
                                    );
                                } finally {
                                    oDialog.setBusy(false);
                                    oOpenButton.setEnabled(
                                        true
                                    );
                                }
                            }.bind(this)
                        }),

                        afterClose: function () {
                            if (
                                this
                                    ._managerSelectionDialog ===
                                oDialog
                            ) {
                                this
                                    ._managerSelectionDialog =
                                    null;
                            }

                            oDialog.destroy();
                        }.bind(this)
                    });

                    this._managerSelectionDialog =
                        oDialog;

                    oView.addDependent(oDialog);
                    oDialog.open();
                } catch (oError) {
                    MessageBox.error(
                        this._getErrorMessage(
                            oError,
                            "Managers could not be loaded."
                        )
                    );
                } finally {
                    this._managerSelectorOpening =
                        false;

                    oView.setBusy(false);
                }
            },

        onChangeManager: function () {
            if (
                this._managerSelectorOpening ||
                this._managerSelectionDialog
            ) {
                return;
            }

            this._setManagerID("");
            this._resetDashboardData();
            this._openManagerSelectionDialog();
        },

        /* ========================================================== */
        /* GENERAL HELPERS                                            */
        /* ========================================================== */

        _toNumber: function (vValue) {
            var nValue = Number(vValue);

            return Number.isFinite(nValue)
                ? nValue
                : 0;
        },

        _clampPercentage: function (vValue) {
            var nValue = Number(vValue);

            if (!Number.isFinite(nValue)) {
                return 0;
            }

            return Math.min(
                Math.max(
                    Number(nValue.toFixed(2)),
                    0
                ),
                100
            );
        },

        _getCompletionState: function (
            nPercentage
        ) {
            if (nPercentage >= 75) {
                return "Success";
            }

            if (nPercentage >= 40) {
                return "Warning";
            }

            return "Information";
        },

        _getErrorMessage: function (
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
                        typeof oResponse
                            .error.message ===
                            "string"
                            ? oResponse.error.message
                            : oResponse.error.message
                                .value;
                }
            } catch (oIgnoredError) {
                // Keep the standard error message.
            }

            return sMessage || sFallback;
        },

        _getInvoiceStatusState: function (
            sStatus
        ) {
            switch (sStatus) {
                case "Paid":
                    return "Success";

                case "Issued":
                case "Sent":
                    return "Information";

                case "Pending":
                case "Draft":
                    return "Warning";

                case "Overdue":
                case "Cancelled":
                    return "Error";

                default:
                    return "None";
            }
        },

        _getProjectStatusState: function (
            sStatus
        ) {
            switch (sStatus) {
                case "Active":
                case "Completed":
                    return "Success";

                case "OnHold":
                    return "Warning";

                case "Cancelled":
                    return "Error";

                case "Draft":
                default:
                    return "Information";
            }
        },

        _getBudgetStatusState: function (
            sStatus
        ) {
            var sNormalizedStatus = String(
                sStatus || ""
            )
                .replace(/\s+/g, "")
                .toLowerCase();

            switch (sNormalizedStatus) {
                case "withinbudget":
                case "approved":
                    return "Success";

                case "atrisk":
                case "revised":
                    return "Warning";

                case "breached":
                    return "Error";

                default:
                    return "Information";
            }
        },

        _getTimesheetStatusState: function (
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

                case "Draft":
                    return "Information";

                default:
                    return "None";
            }
        },

        /* ========================================================== */
        /* ODATA HELPERS                                              */
        /* ========================================================== */

        _requestObjects: async function (
            oODataModel,
            sPath
        ) {
            var oListBinding =
                oODataModel.bindList(sPath);

            var aContexts =
                await oListBinding.requestContexts(
                    0,
                    1000
                );

            return aContexts.map(
                function (oContext) {
                    return oContext.getObject();
                }
            );
        },

        _executeBoundAction: async function (
            sEntitySet,
            sRecordID,
            sActionName,
            mParameters
        ) {
            var oODataModel = this
                .getOwnerComponent()
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

            Object.keys(
                mParameters || {}
            ).forEach(function (sParameterName) {
                oActionBinding.setParameter(
                    sParameterName,
                    mParameters[sParameterName]
                );
            });

            await oActionBinding.execute();

            return oActionBinding
                .getBoundContext();
        },

        /* ========================================================== */
        /* LOAD DASHBOARD                                             */
        /* ========================================================== */

        _loadDashboardData: async function () {
            var oView = this.getView();

            var oDashboardModel =
                oView.getModel("dashboard");

            var sManagerID =
                this._getManagerID();

            if (!sManagerID) {
                this._openManagerSelectionDialog();
                return;
            }

            var sManagerName =
                oDashboardModel.getProperty(
                    "/managerName"
                ) || "Manager";

            oView.setBusy(true);

            try {
                var oODataModel = this
                    .getOwnerComponent()
                    .getModel();

                if (!oODataModel) {
                    throw new Error(
                        "Default OData model is unavailable."
                    );
                }

                var aResults =
                    await Promise.all([
                        this._requestObjects(
                            oODataModel,
                            "/Projects"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/Timesheets"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/Invoices"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/Budgets"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/Employees"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/TimesheetEntries"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/Tasks"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/Milestones"
                        ),
                        this._requestObjects(
                            oODataModel,
                            "/DepartmentSRV"
                        )
                            .catch(
                                function () {
                                    return this._requestObjects(
                                        oODataModel,
                                        "/Departments"
                                    );
                                }.bind(this)
                            )
                            .catch(
                                function (oError) {
                                    console.warn(
                                        "Departments could not be loaded:",
                                        oError
                                    );
                                    return [];
                                }
                            )
                    ]);

                var aProjects = aResults[0];
                var aTimesheets = aResults[1];
                var aInvoices = aResults[2];
                var aBudgets = aResults[3];
                var aEmployees = aResults[4];
                var aTimesheetEntries =
                    aResults[5];
                var aTasks = aResults[6];
                var aMilestones = aResults[7];
                var aDepartments = aResults[8] || [];

                var aManagedProjects =
                    aProjects.filter(
                        function (oProject) {
                            return (
                                oProject.manager_ID ===
                                sManagerID
                            );
                        }
                    );

                var mManagedProjectIDs =
                    new Set(
                        aManagedProjects.map(
                            function (oProject) {
                                return oProject.ID;
                            }
                        )
                    );

                var aManagedBudgets =
                    aBudgets.filter(
                        function (oBudget) {
                            return mManagedProjectIDs.has(
                                oBudget.project_ID
                            );
                        }
                    );

                var aManagedInvoices =
                    aInvoices.filter(
                        function (oInvoice) {
                            return mManagedProjectIDs.has(
                                oInvoice.project_ID
                            );
                        }
                    );

                var mDepartments = new Map();
                aDepartments.forEach(
                    function (oDept) {
                        if (oDept && oDept.ID) {
                            mDepartments.set(
                                oDept.ID,
                                oDept.departmentName ||
                                    oDept.description ||
                                    "Department"
                            );
                        }
                    }
                );

                var mTimesheetsByEmployee = new Map();
                aTimesheets.forEach(
                    function (oTimesheet) {
                        if (
                            !oTimesheet ||
                            !oTimesheet.employee_ID
                        ) {
                            return;
                        }

                        if (
                            !mTimesheetsByEmployee.has(
                                oTimesheet.employee_ID
                            )
                        ) {
                            mTimesheetsByEmployee.set(
                                oTimesheet.employee_ID,
                                []
                            );
                        }

                        mTimesheetsByEmployee
                            .get(
                                oTimesheet.employee_ID
                            )
                            .push(oTimesheet);
                    }
                );

                var mEmployees = new Map();
                aEmployees.forEach(
                    function (oEmployee) {
                        mEmployees.set(
                            oEmployee.ID,
                            oEmployee
                        );
                    }
                );

                /* ================= MANAGER'S TEAM ================= */

                var aTeamMembers = aEmployees
                    .filter(
                        function (oEmployee) {
                            return (
                                oEmployee.managerProfile_ID ===
                                sManagerID
                            );
                        }
                    )
                    .map(
                        function (oEmployee) {
                            var sFullName = [
                                oEmployee.firstName,
                                oEmployee.lastName
                            ]
                                .filter(Boolean)
                                .join(" ") ||
                                oEmployee.email ||
                                "Employee";

                            var sDepartmentName =
                                (oEmployee.department_ID &&
                                    mDepartments.get(
                                        oEmployee.department_ID
                                    )) ||
                                (oEmployee.department &&
                                    oEmployee.department.departmentName) ||
                                "Unassigned";

                            var aEmpTimesheets =
                                mTimesheetsByEmployee.get(
                                    oEmployee.ID
                                ) || [];

                            var sTimesheetStatus =
                                "No Timesheets";
                            var sTimesheetStatusState =
                                "None";

                            var oSubmittedTimesheet =
                                aEmpTimesheets.find(
                                    function (oTs) {
                                        return (
                                            oTs.status ===
                                            "Submitted"
                                        );
                                    }
                                );

                            if (oSubmittedTimesheet) {
                                sTimesheetStatus =
                                    "Submitted";
                                sTimesheetStatusState =
                                    "Warning";
                            } else if (
                                aEmpTimesheets.length > 0
                            ) {
                                var aSortedTimesheets =
                                    aEmpTimesheets
                                        .slice()
                                        .sort(
                                            function (
                                                a,
                                                b
                                            ) {
                                                return String(
                                                    b.weekStartDate ||
                                                        ""
                                                ).localeCompare(
                                                    String(
                                                        a.weekStartDate ||
                                                            ""
                                                    )
                                                );
                                            }
                                        );

                                var oLatestTimesheet =
                                    aSortedTimesheets[0];

                                sTimesheetStatus =
                                    oLatestTimesheet.status ||
                                    "Draft";
                                sTimesheetStatusState =
                                    this._getTimesheetStatusState(
                                        sTimesheetStatus
                                    );
                            }

                            return {
                                ID: oEmployee.ID,
                                firstName:
                                    oEmployee.firstName ||
                                    "",
                                lastName:
                                    oEmployee.lastName ||
                                    "",
                                fullName: sFullName,
                                name: sFullName,
                                email:
                                    oEmployee.email ||
                                    "",
                                jobTitle:
                                    oEmployee.jobTitle ||
                                    "Team Member",
                                departmentID:
                                    oEmployee.department_ID ||
                                    "",
                                departmentName:
                                    sDepartmentName,
                                timesheetStatus:
                                    sTimesheetStatus,
                                timesheetStatusState:
                                    sTimesheetStatusState
                            };
                        }.bind(this)
                    )
                    .sort(
                        function (a, b) {
                            return a.fullName.localeCompare(
                                b.fullName
                            );
                        }
                    );

                var mProjects = new Map();
                var mBudgetsByProject =
                    new Map();
                var mMilestones = new Map();
                var mMilestonesByProject =
                    new Map();
                var mTasks = new Map();
                var mTimesheetProjectIDs =
                    new Map();

                aProjects.forEach(
                    function (oProject) {
                        mProjects.set(
                            oProject.ID,
                            oProject
                        );
                    }
                );

                aManagedBudgets.forEach(
                    function (oBudget) {
                        if (oBudget.project_ID) {
                            mBudgetsByProject.set(
                                oBudget.project_ID,
                                oBudget
                            );
                        }
                    }
                );

                aMilestones.forEach(
                    function (oMilestone) {
                        mMilestones.set(
                            oMilestone.ID,
                            oMilestone
                        );

                        if (
                            !oMilestone.project_ID
                        ) {
                            return;
                        }

                        if (
                            !mMilestonesByProject.has(
                                oMilestone.project_ID
                            )
                        ) {
                            mMilestonesByProject.set(
                                oMilestone.project_ID,
                                []
                            );
                        }

                        mMilestonesByProject
                            .get(
                                oMilestone.project_ID
                            )
                            .push(oMilestone);
                    }
                );

                aTasks.forEach(function (oTask) {
                    mTasks.set(
                        oTask.ID,
                        oTask
                    );
                });

                aTimesheetEntries.forEach(
                    function (oEntry) {
                        var oTask = mTasks.get(
                            oEntry.task_ID
                        ) || {};

                        var oMilestone =
                            mMilestones.get(
                                oTask.milestone_ID
                            ) || {};

                        if (
                            !oEntry.timesheet_ID ||
                            !oMilestone.project_ID
                        ) {
                            return;
                        }

                        if (
                            !mTimesheetProjectIDs.has(
                                oEntry.timesheet_ID
                            )
                        ) {
                            mTimesheetProjectIDs.set(
                                oEntry.timesheet_ID,
                                new Set()
                            );
                        }

                        mTimesheetProjectIDs
                            .get(
                                oEntry.timesheet_ID
                            )
                            .add(
                                oMilestone.project_ID
                            );
                    }
                );

                /* ================= APPROVALS ================= */

                var aPendingApprovals =
                    aTimesheets
                        .filter(
                            function (oTimesheet) {
                                if (
                                    oTimesheet.status !==
                                    "Submitted"
                                ) {
                                    return false;
                                }

                                var oEmployee =
                                    mEmployees.get(
                                        oTimesheet.employee_ID
                                    );

                                if (!oEmployee) {
                                    return false;
                                }

                                return (
                                    oEmployee.managerProfile_ID ===
                                    sManagerID
                                );
                            }
                        )
                        .map(
                            function (oTimesheet) {
                                var oEmployee =
                                    mEmployees.get(
                                        oTimesheet.employee_ID
                                    ) || {};

                                var sEmployeeName = [
                                    oEmployee.firstName,
                                    oEmployee.lastName
                                ]
                                    .filter(Boolean)
                                    .join(" ");

                                var oProjectIDs =
                                    mTimesheetProjectIDs.get(
                                        oTimesheet.ID
                                    ) || new Set();

                                var aProjectNames =
                                    Array.from(
                                        oProjectIDs
                                    )
                                        .map(
                                            function (
                                                sProjectID
                                            ) {
                                                var oProject =
                                                    mProjects.get(
                                                        sProjectID
                                                    ) || {};

                                                return (
                                                    oProject.projectName ||
                                                    oProject.projectCode ||
                                                    sProjectID
                                                );
                                            }
                                        )
                                        .filter(Boolean);

                                return {
                                    ID:
                                        oTimesheet.ID,

                                    employee:
                                        sEmployeeName ||
                                        oEmployee.email ||
                                        oTimesheet
                                            .employee_ID ||
                                        "Employee",

                                    projectNames:
                                        aProjectNames.join(
                                            ", "
                                        ),

                                    weekStartDate:
                                        oTimesheet
                                            .weekStartDate ||
                                        "",

                                    weekEndDate:
                                        oTimesheet
                                            .weekEndDate ||
                                        "",

                                    hours:
                                        this._toNumber(
                                            oTimesheet
                                                .totalBillableHours
                                        ),

                                    status:
                                        oTimesheet.status ||
                                        "Submitted"
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

                /* ================= PROJECTS ================= */

                var aProjectRows =
                    aManagedProjects
                        .map(
                            function (oProject) {
                                var oBudget =
                                    mBudgetsByProject.get(
                                        oProject.ID
                                    ) || {};

                                var nPlannedHours =
                                    this._toNumber(
                                        oProject.plannedHours
                                    );

                                var nConsumedHours =
                                    this._toNumber(
                                        oProject.consumedHours
                                    );

                                var nRemainingHours =
                                    Math.max(
                                        nPlannedHours -
                                        nConsumedHours,
                                        0
                                    );

                                var aProjectMilestones =
                                    mMilestonesByProject.get(
                                        oProject.ID
                                    ) || [];

                                var nCompletionPercent =
                                    0;

                                var sCompletionSource =
                                    "Hours";

                                if (
                                    oProject.status ===
                                    "Completed"
                                ) {
                                    nCompletionPercent =
                                        100;

                                    sCompletionSource =
                                        "Project Status";
                                } else if (
                                    aProjectMilestones.length
                                ) {
                                    var nMilestoneTotal =
                                        aProjectMilestones
                                            .reduce(
                                                function (
                                                    nTotal,
                                                    oMilestone
                                                ) {
                                                    var nMilestoneCompletion =
                                                        this._toNumber(
                                                            oMilestone
                                                                .completionPercent
                                                        );

                                                    if (
                                                        oMilestone.status ===
                                                        "Completed"
                                                    ) {
                                                        nMilestoneCompletion =
                                                            100;
                                                    }

                                                    return (
                                                        nTotal +
                                                        this._clampPercentage(
                                                            nMilestoneCompletion
                                                        )
                                                    );
                                                }.bind(this),
                                                0
                                            );

                                    nCompletionPercent =
                                        nMilestoneTotal /
                                        aProjectMilestones.length;

                                    sCompletionSource =
                                        "Milestones";
                                } else if (
                                    nPlannedHours > 0
                                ) {
                                    nCompletionPercent =
                                        (
                                            nConsumedHours /
                                            nPlannedHours
                                        ) *
                                        100;

                                    sCompletionSource =
                                        "Hours";
                                }

                                nCompletionPercent =
                                    this._clampPercentage(
                                        nCompletionPercent
                                    );

                                var sCompletionDetails;

                                if (
                                    sCompletionSource ===
                                    "Milestones"
                                ) {
                                    sCompletionDetails =
                                        aProjectMilestones.length +
                                        (
                                            aProjectMilestones.length ===
                                            1
                                                ? " Milestone"
                                                : " Milestones"
                                        );
                                } else if (
                                    sCompletionSource ===
                                    "Project Status"
                                ) {
                                    sCompletionDetails =
                                        "Project Completed";
                                } else {
                                    sCompletionDetails =
                                        "Based on Hours";
                                }

                                return {
                                    ID:
                                        oProject.ID,

                                    projectCode:
                                        oProject
                                            .projectCode ||
                                        "",

                                    projectName:
                                        oProject
                                            .projectName ||
                                        "",

                                    status:
                                        oProject.status ||
                                        "",

                                    statusState:
                                        this
                                            ._getProjectStatusState(
                                                oProject.status
                                            ),

                                    plannedHours:
                                        Number(
                                            nPlannedHours
                                                .toFixed(2)
                                        ),

                                    consumedHours:
                                        Number(
                                            nConsumedHours
                                                .toFixed(2)
                                        ),

                                    remainingHours:
                                        Number(
                                            nRemainingHours
                                                .toFixed(2)
                                        ),

                                    completionPercent:
                                        nCompletionPercent,

                                    completionDisplay:
                                        nCompletionPercent
                                            .toFixed(0) +
                                        "%",

                                    completionState:
                                        this
                                            ._getCompletionState(
                                                nCompletionPercent
                                            ),

                                    completionSource:
                                        sCompletionSource,

                                    completionDetails:
                                        sCompletionDetails,

                                    milestoneCount:
                                        aProjectMilestones
                                            .length,

                                    budgetID:
                                        oBudget.ID ||
                                        "",

                                    budgetAmount:
                                        this._toNumber(
                                            oBudget
                                                .budgetAmount
                                        ),

                                    consumedAmount:
                                        this._toNumber(
                                            oBudget
                                                .consumedAmount
                                        ),

                                    remainingAmount:
                                        this._toNumber(
                                            oBudget
                                                .remainingAmount
                                        ),

                                    billingRateHr:
                                        this._toNumber(
                                            oBudget
                                                .billingRateHr
                                        ),

                                    currencyCode:
                                        oBudget
                                            .currencyCode ||
                                        "",

                                    budgetStatus:
                                        oBudget
                                            .budgetStatus ||
                                        "Not Available",

                                    budgetStatusState:
                                        this
                                            ._getBudgetStatusState(
                                                oBudget
                                                    .budgetStatus
                                            ),

                                    hasBudget:
                                        Boolean(
                                            oBudget.ID
                                        )
                                };
                            }.bind(this)
                        )
                        .sort(
                            function (
                                oFirst,
                                oSecond
                            ) {
                                return String(
                                    oFirst.projectCode
                                ).localeCompare(
                                    String(
                                        oSecond.projectCode
                                    )
                                );
                            }
                        );

                var nOverallCompletion =
                    aProjectRows.length
                        ? aProjectRows.reduce(
                            function (
                                nTotal,
                                oProject
                            ) {
                                return (
                                    nTotal +
                                    oProject
                                        .completionPercent
                                );
                            },
                            0
                        ) /
                        aProjectRows.length
                        : 0;

                nOverallCompletion =
                    this._clampPercentage(
                        nOverallCompletion
                    );

                /* ================= INVOICES ================= */

                var aInvoiceRows =
                    aManagedInvoices
                        .map(
                            function (oInvoice) {
                                var oProject =
                                    mProjects.get(
                                        oInvoice.project_ID
                                    ) || {};

                                var nSubtotal =
                                    this._toNumber(
                                        oInvoice.totalAmount
                                    );

                                var nTax =
                                    this._toNumber(
                                        oInvoice.taxAmount
                                    );

                                var sPaymentStatus =
                                    oInvoice.paymentStatus ||
                                    "Draft";

                                var sInvoiceStatus =
                                    oInvoice.status ||
                                    "Draft";

                                var bIsPaid =
                                    sPaymentStatus ===
                                        "Paid" ||
                                    sInvoiceStatus ===
                                        "Paid";

                                var bCanIssue =
                                    !bIsPaid &&
                                    (
                                        sPaymentStatus ===
                                            "Draft" ||
                                        sPaymentStatus ===
                                            "Pending"
                                    ) &&
                                    (
                                        sInvoiceStatus ===
                                            "Draft" ||
                                        sInvoiceStatus ===
                                            "Pending"
                                    );

                                var bCanMarkPaid =
                                    !bIsPaid &&
                                    (
                                        sPaymentStatus ===
                                            "Issued" ||
                                        sInvoiceStatus ===
                                            "Issued" ||
                                        sInvoiceStatus ===
                                            "Sent"
                                    );

                                return {
                                    ID:
                                        oInvoice.ID,

                                    invoiceNumber:
                                        oInvoice
                                            .invoiceNumber ||
                                        "",

                                    projectID:
                                        oInvoice
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

                                    invoiceDate:
                                        oInvoice
                                            .invoiceDate ||
                                        "",

                                    dueDate:
                                        oInvoice.dueDate ||
                                        "",

                                    billableHours:
                                        this._toNumber(
                                            oInvoice
                                                .billableHours
                                        ),

                                    subtotal:
                                        Number(
                                            nSubtotal.toFixed(
                                                2
                                            )
                                        ),

                                    taxAmount:
                                        Number(
                                            nTax.toFixed(2)
                                        ),

                                    payableAmount:
                                        Number(
                                            (
                                                nSubtotal +
                                                nTax
                                            ).toFixed(2)
                                        ),

                                    currencyCode:
                                        oInvoice
                                            .currencyCode ||
                                        "",

                                    paymentStatus:
                                        sPaymentStatus,

                                    invoiceStatus:
                                        sInvoiceStatus,

                                    statusState:
                                        this
                                            ._getInvoiceStatusState(
                                                sPaymentStatus
                                            ),

                                    canIssue:
                                        bCanIssue,

                                    canMarkPaid:
                                        bCanMarkPaid,

                                    isPaid:
                                        bIsPaid
                                };
                            }.bind(this)
                        )
                        .sort(
                            function (
                                oFirst,
                                oSecond
                            ) {
                                var sFirstDate =
                                    String(
                                        oFirst.invoiceDate ||
                                        ""
                                    );

                                var sSecondDate =
                                    String(
                                        oSecond.invoiceDate ||
                                        ""
                                    );

                                if (
                                    sSecondDate !==
                                    sFirstDate
                                ) {
                                    return sSecondDate
                                        .localeCompare(
                                            sFirstDate
                                        );
                                }

                                return String(
                                    oSecond.invoiceNumber
                                ).localeCompare(
                                    String(
                                        oFirst.invoiceNumber
                                    )
                                );
                            }
                        );

                /* ================= KPIs ================= */

                var iActiveProjects =
                    aManagedProjects.filter(
                        function (oProject) {
                            return (
                                oProject.status ===
                                "Active"
                            );
                        }
                    ).length;

                var iPaidInvoices =
                    aManagedInvoices.filter(
                        function (oInvoice) {
                            return (
                                oInvoice.paymentStatus ===
                                    "Paid" ||
                                oInvoice.status ===
                                    "Paid"
                            );
                        }
                    ).length;

                var iAtRiskBudgets =
                    aManagedBudgets.filter(
                        function (oBudget) {
                            var sStatus =
                                String(
                                    oBudget
                                        .budgetStatus ||
                                    ""
                                )
                                    .replace(
                                        /\s+/g,
                                        ""
                                    )
                                    .toLowerCase();

                            return (
                                sStatus === "atrisk" ||
                                sStatus === "breached"
                            );
                        }
                    ).length;

                oDashboardModel.setData({
                    managerID:
                        sManagerID,

                    managerName:
                        sManagerName,

                    activeProjects:
                        iActiveProjects,

                    pendingApprovals:
                        aPendingApprovals.length,

                    paidInvoices:
                        iPaidInvoices,

                    atRiskBudgets:
                        iAtRiskBudgets,

                    overallCompletion:
                        nOverallCompletion,

                    overallCompletionDisplay:
                        nOverallCompletion.toFixed(
                            0
                        ) +
                        "%",

                    overallCompletionState:
                        this._getCompletionState(
                            nOverallCompletion
                        ),

                    approvals:
                        aPendingApprovals,

                    projects:
                        aProjectRows,

                    invoices:
                        aInvoiceRows,

                    teamMembers:
                        aTeamMembers,

                    teamCount:
                        aTeamMembers.length
                });
            } catch (oError) {
                console.error(
                    "Manager Dashboard loading failed:",
                    oError
                );

                oDashboardModel.setData({
                    managerID:
                        sManagerID,

                    managerName:
                        sManagerName,

                    activeProjects: 0,
                    pendingApprovals: 0,
                    paidInvoices: 0,
                    atRiskBudgets: 0,

                    overallCompletion: 0,
                    overallCompletionDisplay:
                        "0%",
                    overallCompletionState:
                        "Information",

                    approvals: [],
                    projects: [],
                    invoices: [],
                    teamMembers: [],
                    teamCount: 0
                });

                MessageBox.error(
                    this._getErrorMessage(
                        oError,
                        "Manager Dashboard data could not be loaded."
                    )
                );
            } finally {
                oView.setBusy(false);
            }
        },

        /* ========================================================== */
        /* REFRESH                                                    */
        /* ========================================================== */

        onRefresh: async function () {
            if (!this._getManagerID()) {
                this._openManagerSelectionDialog();
                return;
            }

            await this._loadDashboardData();

            MessageToast.show(
                "Manager Dashboard refreshed"
            );
        },

        /* ========================================================== */
        /* APPROVE TIMESHEET                                          */
        /* ========================================================== */

        onApproveTimesheet: function (
            oEvent
        ) {
            var oButton =
                oEvent.getSource();

            var oContext =
                oButton.getBindingContext(
                    "dashboard"
                );

            var oTimesheet =
                oContext &&
                oContext.getObject();

            if (
                !oTimesheet ||
                !oTimesheet.ID
            ) {
                MessageBox.error(
                    "Timesheet ID is unavailable."
                );
                return;
            }

            MessageBox.confirm(
                "Approve the selected Timesheet?",
                {
                    title:
                        "Approve Timesheet",

                    emphasizedAction:
                        MessageBox.Action.OK,

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    onClose: async function (
                        sAction
                    ) {
                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        try {
                            oButton.setBusy(true);

                            await this
                                ._executeBoundAction(
                                    "Timesheets",
                                    oTimesheet.ID,
                                    "approveTimesheet"
                                );

                            MessageToast.show(
                                "Timesheet approved successfully"
                            );

                            await this
                                ._loadDashboardData();
                        } catch (oError) {
                            console.error(
                                "Timesheet approval failed:",
                                oError
                            );

                            MessageBox.error(
                                this._getErrorMessage(
                                    oError,
                                    "Timesheet approval failed."
                                )
                            );
                        } finally {
                            oButton.setBusy(false);
                        }
                    }.bind(this)
                }
            );
        },

        /* ========================================================== */
        /* REJECT TIMESHEET                                           */
        /* ========================================================== */

        onRejectTimesheet: function (
            oEvent
        ) {
            var oButton =
                oEvent.getSource();

            var oContext =
                oButton.getBindingContext(
                    "dashboard"
                );

            var oTimesheet =
                oContext &&
                oContext.getObject();

            if (
                !oTimesheet ||
                !oTimesheet.ID
            ) {
                MessageBox.error(
                    "Timesheet ID is unavailable."
                );
                return;
            }

            var oReasonTextArea =
                new TextArea({
                    width: "100%",
                    rows: 4,
                    maxLength: 255,
                    placeholder:
                        "Enter the rejection reason"
                });

            var oDialog =
                new Dialog({
                    title:
                        "Reject Timesheet",

                    contentWidth:
                        "30rem",

                    content: [
                        new VBox({
                            items: [
                                new Label({
                                    text:
                                        "Rejection Reason",

                                    required:
                                        true,

                                    labelFor:
                                        oReasonTextArea
                                }),

                                oReasonTextArea
                            ]
                        }).addStyleClass(
                            "sapUiSmallMargin"
                        )
                    ],

                    beginButton:
                        new Button({
                            text:
                                "Reject",

                            type:
                                "Reject",

                            press:
                                async function () {
                                    var sReason =
                                        oReasonTextArea
                                            .getValue()
                                            .trim();

                                    if (!sReason) {
                                        MessageBox.warning(
                                            "Rejection reason is mandatory."
                                        );
                                        return;
                                    }

                                    try {
                                        oDialog.setBusy(
                                            true
                                        );

                                        await this
                                            ._executeBoundAction(
                                                "Timesheets",
                                                oTimesheet.ID,
                                                "rejectTimesheet",
                                                {
                                                    reason:
                                                        sReason
                                                }
                                            );

                                        MessageToast.show(
                                            "Timesheet rejected successfully"
                                        );

                                        oDialog.close();

                                        await this
                                            ._loadDashboardData();
                                    } catch (oError) {
                                        console.error(
                                            "Timesheet rejection failed:",
                                            oError
                                        );

                                        MessageBox.error(
                                            this._getErrorMessage(
                                                oError,
                                                "Timesheet rejection failed."
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
        /* RECALCULATE BUDGET                                         */
        /* ========================================================== */

        onRecalculateBudget: async function (
            oEvent
        ) {
            var oButton =
                oEvent.getSource();

            var oContext =
                oButton.getBindingContext(
                    "dashboard"
                );

            var oProject =
                oContext &&
                oContext.getObject();

            if (
                !oProject ||
                !oProject.ID
            ) {
                MessageBox.error(
                    "Project ID is unavailable."
                );
                return;
            }

            if (!oProject.hasBudget) {
                MessageBox.warning(
                    "The selected Project does not have a Budget."
                );
                return;
            }

            try {
                oButton.setBusy(true);

                await this._executeBoundAction(
                    "Projects",
                    oProject.ID,
                    "recalculateBudget"
                );

                MessageToast.show(
                    "Budget recalculated successfully"
                );

                await this._loadDashboardData();
            } catch (oError) {
                console.error(
                    "Budget recalculation failed:",
                    oError
                );

                MessageBox.error(
                    this._getErrorMessage(
                        oError,
                        "Budget recalculation failed."
                    )
                );
            } finally {
                oButton.setBusy(false);
            }
        },

        /* ========================================================== */
        /* GENERATE INVOICE                                           */
        /* ========================================================== */

        onGenerateInvoice: function (
            oEvent
        ) {
            var oButton =
                oEvent.getSource();

            var oContext =
                oButton.getBindingContext(
                    "dashboard"
                );

            var oProject =
                oContext &&
                oContext.getObject();

            if (
                !oProject ||
                !oProject.ID
            ) {
                MessageBox.error(
                    "Project ID is unavailable."
                );
                return;
            }

            if (!oProject.hasBudget) {
                MessageBox.warning(
                    "The selected Project does not have a Budget."
                );
                return;
            }

            MessageBox.confirm(
                "Generate an Invoice for " +
                oProject.projectName +
                "?",
                {
                    title:
                        "Generate Invoice",

                    emphasizedAction:
                        MessageBox.Action.OK,

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    onClose: async function (
                        sAction
                    ) {
                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        try {
                            oButton.setBusy(true);

                            await this
                                ._executeBoundAction(
                                    "Projects",
                                    oProject.ID,
                                    "generateInvoice"
                                );

                            MessageToast.show(
                                "Draft Invoice generated successfully"
                            );

                            await this
                                ._loadDashboardData();
                        } catch (oError) {
                            console.error(
                                "Invoice generation failed:",
                                oError
                            );

                            MessageBox.error(
                                this._getErrorMessage(
                                    oError,
                                    "Invoice generation failed."
                                )
                            );
                        } finally {
                            oButton.setBusy(false);
                        }
                    }.bind(this)
                }
            );
        },

        /* ========================================================== */
        /* ISSUE INVOICE                                              */
        /* ========================================================== */

        onIssueInvoice: function (
            oEvent
        ) {
            var oButton =
                oEvent.getSource();

            var oContext =
                oButton.getBindingContext(
                    "dashboard"
                );

            var oInvoice =
                oContext &&
                oContext.getObject();

            if (
                !oInvoice ||
                !oInvoice.ID
            ) {
                MessageBox.error(
                    "Invoice ID is unavailable."
                );
                return;
            }

            if (!oInvoice.canIssue) {
                MessageBox.warning(
                    "Only a Draft or Pending Invoice can be issued."
                );
                return;
            }

            MessageBox.confirm(
                "Issue Invoice " +
                oInvoice.invoiceNumber +
                "?",
                {
                    title:
                        "Issue Invoice",

                    emphasizedAction:
                        MessageBox.Action.OK,

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    onClose: async function (
                        sAction
                    ) {
                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        try {
                            oButton.setBusy(true);

                            await this
                                ._executeBoundAction(
                                    "Invoices",
                                    oInvoice.ID,
                                    "issue"
                                );

                            MessageToast.show(
                                "Invoice issued successfully"
                            );

                            await this
                                ._loadDashboardData();
                        } catch (oError) {
                            console.error(
                                "Invoice issue failed:",
                                oError
                            );

                            MessageBox.error(
                                this._getErrorMessage(
                                    oError,
                                    "Invoice issue failed."
                                )
                            );
                        } finally {
                            oButton.setBusy(false);
                        }
                    }.bind(this)
                }
            );
        },

        /* ========================================================== */
        /* MARK INVOICE PAID                                          */
        /* ========================================================== */

        onMarkInvoicePaid: function (
            oEvent
        ) {
            var oButton =
                oEvent.getSource();

            var oContext =
                oButton.getBindingContext(
                    "dashboard"
                );

            var oInvoice =
                oContext &&
                oContext.getObject();

            if (
                !oInvoice ||
                !oInvoice.ID
            ) {
                MessageBox.error(
                    "Invoice ID is unavailable."
                );
                return;
            }

            if (!oInvoice.canMarkPaid) {
                MessageBox.warning(
                    "Only an issued Invoice can be marked as paid."
                );
                return;
            }

            MessageBox.confirm(
                "Confirm that Client payment was received for Invoice " +
                oInvoice.invoiceNumber +
                "?",
                {
                    title:
                        "Confirm Payment",

                    emphasizedAction:
                        MessageBox.Action.OK,

                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],

                    onClose: async function (
                        sAction
                    ) {
                        if (
                            sAction !==
                            MessageBox.Action.OK
                        ) {
                            return;
                        }

                        try {
                            oButton.setBusy(true);

                            await this
                                ._executeBoundAction(
                                    "Invoices",
                                    oInvoice.ID,
                                    "markPaid"
                                );

                            MessageToast.show(
                                "Invoice marked as paid successfully"
                            );

                            await this
                                ._loadDashboardData();
                        } catch (oError) {
                            console.error(
                                "Mark Invoice paid failed:",
                                oError
                            );

                            MessageBox.error(
                                this._getErrorMessage(
                                    oError,
                                    "Invoice could not be marked as paid."
                                )
                            );
                        } finally {
                            oButton.setBusy(false);
                        }
                    }.bind(this)
                }
            );
        }
    });
});