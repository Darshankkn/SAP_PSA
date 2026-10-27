const cds = require("@sap/cds");
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

module.exports = cds.service.impl(async function () {
    const {
        Departments,
        Employees,
        Managers,
        Clients,
        Projects,
        Budgets,
        Milestones,
        Tasks,
        Timesheets,
        TimesheetEntries,
        Invoices
    } = this.entities;

    const dateOnly = (value = new Date()) =>
        new Date(value).toISOString().slice(0, 10);

    const cleanData = (data) =>
        Object.fromEntries(
            Object.entries(data).filter(
                ([, value]) => value !== undefined
            )
        );

    const boundID = (req) => {
        const ID =
            req.params?.[0]?.ID ||
            req.data?.ID;

        if (!ID) {
            req.reject(
                400,
                "Record ID is required"
            );
        }

        return ID;
    };

    const getOne = async (
        req,
        entity,
        where,
        message
    ) => {
        const record = await SELECT.one
            .from(entity)
            .where(where);

        if (!record) {
            req.reject(404, message);
        }

        return record;
    };

    const budgetStatusFor = (
        consumedAmount,
        budgetAmount
    ) => {
        const total = Number(
            budgetAmount || 0
        );

        if (total <= 0) {
            return "WithinBudget";
        }

        const percentage =
            (
                Number(consumedAmount || 0) /
                total
            ) * 100;

        if (percentage >= 100) {
            return "Breached";
        }

        if (percentage >= 80) {
            return "AtRisk";
        }

        return "WithinBudget";
    };

    const recalculateProject = async (
        projectID
    ) => {
        const milestones = await SELECT
            .from(Milestones)
            .where({
                project_ID: projectID
            });

        let projectConsumedHours = 0;

        for (const milestone of milestones) {
            const tasks = await SELECT
                .from(Tasks)
                .where({
                    milestone_ID:
                        milestone.ID
                });

            for (const task of tasks) {
                const taskEntries = await SELECT
                    .from(TimesheetEntries)
                    .where({
                        task_ID: task.ID
                    });

                let approvedTaskHours = 0;

                for (const entry of taskEntries) {
                    const parentTimesheet =
                        await SELECT.one
                            .from(Timesheets)
                            .where({
                                ID:
                                    entry.timesheet_ID
                            });

                    if (
                        parentTimesheet &&
                        (
                            parentTimesheet.status ===
                                "Approved" ||
                            parentTimesheet.status ===
                                "Invoiced"
                        )
                    ) {
                        approvedTaskHours += Number(
                            entry.hours || 0
                        );
                    }
                }

                approvedTaskHours = Number(
                    approvedTaskHours.toFixed(2)
                );

                await UPDATE(Tasks)
                    .set({
                        actualHours:
                            approvedTaskHours
                    })
                    .where({
                        ID: task.ID
                    });

                projectConsumedHours +=
                    approvedTaskHours;
            }
        }

        projectConsumedHours = Number(
            projectConsumedHours.toFixed(2)
        );

        await UPDATE(Projects)
            .set({
                consumedHours:
                    projectConsumedHours
            })
            .where({
                ID: projectID
            });

        const budget = await SELECT.one
            .from(Budgets)
            .where({
                project_ID: projectID
            });

        if (!budget) {
            return null;
        }

        const budgetAmount = Number(
            budget.budgetAmount || 0
        );

        const billingRateHr = Number(
            budget.billingRateHr || 0
        );

        const consumedAmount = Number(
            (
                projectConsumedHours *
                billingRateHr
            ).toFixed(2)
        );

        const remainingAmount = Number(
            (
                budgetAmount -
                consumedAmount
            ).toFixed(2)
        );

        const budgetStatus =
            budgetStatusFor(
                consumedAmount,
                budgetAmount
            );

        await UPDATE(Budgets)
            .set({
                consumedAmount,
                remainingAmount,
                budgetStatus
            })
            .where({
                ID: budget.ID
            });

        return SELECT.one
            .from(Budgets)
            .where({
                ID: budget.ID
            });
    };

    const recalculateProjectsForTimesheet =
        async (timesheetID) => {
            const entries = await SELECT
                .from(TimesheetEntries)
                .where({
                    timesheet_ID:
                        timesheetID
                });

            if (!entries.length) {
                return;
            }

            const taskIDs = [
                ...new Set(
                    entries
                        .map(
                            (entry) =>
                                entry.task_ID
                        )
                        .filter(Boolean)
                )
            ];

            const projectIDs = new Set();

            for (const taskID of taskIDs) {
                const task = await SELECT.one
                    .from(Tasks)
                    .where({
                        ID: taskID
                    });

                if (
                    !task ||
                    !task.milestone_ID
                ) {
                    continue;
                }

                const milestone =
                    await SELECT.one
                        .from(Milestones)
                        .where({
                            ID:
                                task.milestone_ID
                        });

                if (
                    milestone &&
                    milestone.project_ID
                ) {
                    projectIDs.add(
                        milestone.project_ID
                    );
                }
            }

            for (const projectID of projectIDs) {
                await recalculateProject(
                    projectID
                );
            }
        };

    /* Departments */

    this.on(
        "createDepartment",
        async (req) => {
            const ID = cds.utils.uuid();

            await INSERT.into(
                Departments
            ).entries({
                ID,
                departmentName:
                    req.data.departmentName,
                description:
                    req.data.description
            });

            return SELECT.one
                .from(Departments)
                .where({ ID });
        }
    );

    this.on(
        "updateDepartment",
        async (req) => {
            const {
                ID,
                departmentName,
                description
            } = req.data;

            await getOne(
                req,
                Departments,
                { ID },
                "Department not found"
            );

            await UPDATE(Departments)
                .set(
                    cleanData({
                        departmentName,
                        description
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Departments)
                .where({ ID });
        }
    );

    this.on(
        "deleteDepartment",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Departments,
                { ID },
                "Department not found"
            );

            await DELETE
                .from(Departments)
                .where({ ID });

            return "Department deleted successfully";
        }
    );

    /* Employees */

    this.on(
        "createEmployee",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            if (data.departmentID) {
                await getOne(
                    req,
                    Departments,
                    {
                        ID:
                            data.departmentID
                    },
                    "Department not found"
                );
            }

            await INSERT
                .into(Employees)
                .entries(
                    cleanData({
                        ID,
                        firstName:
                            data.firstName,
                        lastName:
                            data.lastName,
                        email:
                            data.email,
                        jobTitle:
                            data.jobTitle,
                        joinDate:
                            data.joinDate,
                        hourlyRate:
                            data.hourlyRate,
                        status:
                            data.status ||
                            "Active",
                        department_ID:
                            data.departmentID
                    })
                );

            return SELECT.one
                .from(Employees)
                .where({ ID });
        }
    );

    this.on(
        "updateEmployee",
        async (req) => {
            const {
                ID,
                firstName,
                lastName,
                email,
                jobTitle,
                joinDate,
                hourlyRate,
                status,
                departmentID
            } = req.data;

            await getOne(
                req,
                Employees,
                { ID },
                "Employee not found"
            );

            if (departmentID) {
                await getOne(
                    req,
                    Departments,
                    {
                        ID: departmentID
                    },
                    "Department not found"
                );
            }

            await UPDATE(Employees)
                .set(
                    cleanData({
                        firstName,
                        lastName,
                        email,
                        jobTitle,
                        joinDate,
                        hourlyRate,
                        status,
                        department_ID:
                            departmentID
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Employees)
                .where({ ID });
        }
    );

    this.on(
        "deleteEmployee",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Employees,
                { ID },
                "Employee not found"
            );

            await DELETE
                .from(Employees)
                .where({ ID });

            return "Employee deleted successfully";
        }
    );

    /* Managers */

    this.on(
        "createManager",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            await getOne(
                req,
                Employees,
                {
                    ID: data.employeeID
                },
                "Employee not found"
            );

            await getOne(
                req,
                Departments,
                {
                    ID: data.departmentID
                },
                "Department not found"
            );

            await INSERT
                .into(Managers)
                .entries({
                    ID,
                    employee_ID:
                        data.employeeID,
                    department_ID:
                        data.departmentID,
                    managerLevel:
                        data.managerLevel,
                    status:
                        data.status ||
                        "Active"
                });

            return SELECT.one
                .from(Managers)
                .where({ ID });
        }
    );

    this.on(
        "updateManager",
        async (req) => {
            const {
                ID,
                managerLevel,
                status
            } = req.data;

            await getOne(
                req,
                Managers,
                { ID },
                "Manager not found"
            );

            await UPDATE(Managers)
                .set(
                    cleanData({
                        managerLevel,
                        status
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Managers)
                .where({ ID });
        }
    );

    this.on(
        "deleteManager",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Managers,
                { ID },
                "Manager not found"
            );

            await DELETE
                .from(Managers)
                .where({ ID });

            return "Manager deleted successfully";
        }
    );

    /* Clients */

    this.on(
        "createClient",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            await INSERT
                .into(Clients)
                .entries({
                    ID,
                    clientName:
                        data.clientName,
                    contactPerson:
                        data.contactPerson,
                    email:
                        data.email,
                    phoneNumber:
                        data.phoneNumber,
                    country:
                        data.country,
                    industry:
                        data.industry,
                    status:
                        data.status ||
                        "Active"
                });

            return SELECT.one
                .from(Clients)
                .where({ ID });
        }
    );

    this.on(
        "updateClient",
        async (req) => {
            const {
                ID,
                clientName,
                contactPerson,
                email,
                phoneNumber,
                country,
                industry,
                status
            } = req.data;

            await getOne(
                req,
                Clients,
                { ID },
                "Client not found"
            );

            await UPDATE(Clients)
                .set(
                    cleanData({
                        clientName,
                        contactPerson,
                        email,
                        phoneNumber,
                        country,
                        industry,
                        status
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Clients)
                .where({ ID });
        }
    );

    this.on(
        "deleteClient",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Clients,
                { ID },
                "Client not found"
            );

            await DELETE
                .from(Clients)
                .where({ ID });

            return "Client deleted successfully";
        }
    );

    /* Projects */

    this.on(
        "createProject",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            if (
                data.startDate &&
                data.endDate &&
                data.endDate <
                    data.startDate
            ) {
                req.reject(
                    400,
                    "Project end date cannot be before start date"
                );
            }

            if (
                Number(
                    data.plannedHours || 0
                ) < 0
            ) {
                req.reject(
                    400,
                    "Planned hours cannot be negative"
                );
            }

            if (data.clientID) {
                await getOne(
                    req,
                    Clients,
                    {
                        ID: data.clientID
                    },
                    "Client not found"
                );
            }

            if (data.managerID) {
                await getOne(
                    req,
                    Managers,
                    {
                        ID: data.managerID
                    },
                    "Manager not found"
                );
            }

            await INSERT
                .into(Projects)
                .entries(
                    cleanData({
                        ID,
                        projectCode:
                            data.projectCode,
                        projectName:
                            data.projectName,
                        status:
                            data.status ||
                            "Draft",
                        billingType:
                            data.billingType,
                        startDate:
                            data.startDate,
                        endDate:
                            data.endDate,
                        plannedHours:
                            data.plannedHours,
                        consumedHours:
                            data.consumedHours ??
                            0,
                        client_ID:
                            data.clientID,
                        manager_ID:
                            data.managerID
                    })
                );

            return SELECT.one
                .from(Projects)
                .where({ ID });
        }
    );

    this.on(
        "updateProject",
        async (req) => {
            const {
                ID,
                projectCode,
                projectName,
                status,
                billingType,
                startDate,
                endDate,
                plannedHours,
                consumedHours,
                clientID,
                managerID
            } = req.data;

            await getOne(
                req,
                Projects,
                { ID },
                "Project not found"
            );

            if (
                startDate &&
                endDate &&
                endDate < startDate
            ) {
                req.reject(
                    400,
                    "Project end date cannot be before start date"
                );
            }

            if (clientID) {
                await getOne(
                    req,
                    Clients,
                    {
                        ID: clientID
                    },
                    "Client not found"
                );
            }

            if (managerID) {
                await getOne(
                    req,
                    Managers,
                    {
                        ID: managerID
                    },
                    "Manager not found"
                );
            }

            await UPDATE(Projects)
                .set(
                    cleanData({
                        projectCode,
                        projectName,
                        status,
                        billingType,
                        startDate,
                        endDate,
                        plannedHours,
                        consumedHours,
                        client_ID:
                            clientID,
                        manager_ID:
                            managerID
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Projects)
                .where({ ID });
        }
    );

    this.on(
        "deleteProject",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Projects,
                { ID },
                "Project not found"
            );

            await DELETE
                .from(Projects)
                .where({ ID });

            return "Project deleted successfully";
        }
    );

    /* Budgets */

    this.on(
        "createBudget",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            await getOne(
                req,
                Projects,
                {
                    ID: data.projectID
                },
                "Project not found"
            );

            const existing =
                await SELECT.one
                    .from(Budgets)
                    .where({
                        project_ID:
                            data.projectID
                    });

            if (existing) {
                req.reject(
                    409,
                    "A budget already exists for this project"
                );
            }

            const budgetAmount = Number(
                data.budgetAmount || 0
            );

            const consumedAmount = Number(
                data.consumedAmount || 0
            );

            if (budgetAmount <= 0) {
                req.reject(
                    400,
                    "Budget amount must be greater than zero"
                );
            }

            const remainingAmount =
                data.remainingAmount !==
                undefined
                    ? Number(
                        data.remainingAmount
                    )
                    : budgetAmount -
                      consumedAmount;

            await INSERT
                .into(Budgets)
                .entries({
                    ID,
                    project_ID:
                        data.projectID,
                    budgetAmount,
                    consumedAmount,
                    remainingAmount,
                    billingRateHr:
                        Number(
                            data.billingRateHr ||
                            0
                        ),
                    currencyCode:
                        data.currencyCode,
                    budgetStatus:
                        data.budgetStatus ||
                        budgetStatusFor(
                            consumedAmount,
                            budgetAmount
                        )
                });

            return SELECT.one
                .from(Budgets)
                .where({ ID });
        }
    );

    this.on(
        "updateBudget",
        async (req) => {
            const {
                ID,
                budgetAmount,
                consumedAmount,
                remainingAmount,
                billingRateHr,
                budgetStatus
            } = req.data;

            await getOne(
                req,
                Budgets,
                { ID },
                "Budget not found"
            );

            if (
                budgetAmount !== undefined &&
                Number(budgetAmount) <= 0
            ) {
                req.reject(
                    400,
                    "Budget amount must be greater than zero"
                );
            }

            await UPDATE(Budgets)
                .set(
                    cleanData({
                        budgetAmount,
                        consumedAmount,
                        remainingAmount,
                        billingRateHr,
                        budgetStatus
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Budgets)
                .where({ ID });
        }
    );

    this.on(
        "deleteBudget",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Budgets,
                { ID },
                "Budget not found"
            );

            await DELETE
                .from(Budgets)
                .where({ ID });

            return "Budget deleted successfully";
        }
    );

    this.on(
        "recalculateBudget",
        "Projects",
        async (req) => {
            const projectID =
                boundID(req);

            await getOne(
                req,
                Projects,
                {
                    ID: projectID
                },
                "Project not found"
            );

            const budget =
                await recalculateProject(
                    projectID
                );

            if (!budget) {
                req.reject(
                    404,
                    "Budget not found"
                );
            }

            return budget;
        }
    );

    /* Milestones */

    this.on(
        "createMilestone",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            const project =
                await getOne(
                    req,
                    Projects,
                    {
                        ID: data.projectID
                    },
                    "Project not found"
                );

            if (
                data.startDate &&
                project.startDate &&
                data.startDate <
                    project.startDate
            ) {
                req.reject(
                    400,
                    "Milestone start date cannot be before project start date"
                );
            }

            if (
                data.endDate &&
                project.endDate &&
                data.endDate >
                    project.endDate
            ) {
                req.reject(
                    400,
                    "Milestone end date cannot be after project end date"
                );
            }

            await INSERT
                .into(Milestones)
                .entries({
                    ID,
                    project_ID:
                        data.projectID,
                    milestoneName:
                        data.milestoneName,
                    startDate:
                        data.startDate,
                    endDate:
                        data.endDate,
                    completionPercent:
                        data.completionPercent ??
                        0,
                    status:
                        data.status ||
                        "NotStarted"
                });

            return SELECT.one
                .from(Milestones)
                .where({ ID });
        }
    );

    this.on(
        "updateMilestone",
        async (req) => {
            const {
                ID,
                milestoneName,
                startDate,
                endDate,
                completionPercent,
                status
            } = req.data;

            await getOne(
                req,
                Milestones,
                { ID },
                "Milestone not found"
            );

            if (
                completionPercent !==
                    undefined &&
                (
                    Number(
                        completionPercent
                    ) < 0 ||
                    Number(
                        completionPercent
                    ) > 100
                )
            ) {
                req.reject(
                    400,
                    "Completion percentage must be between 0 and 100"
                );
            }

            await UPDATE(Milestones)
                .set(
                    cleanData({
                        milestoneName,
                        startDate,
                        endDate,
                        completionPercent,
                        status
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Milestones)
                .where({ ID });
        }
    );

    this.on(
        "deleteMilestone",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Milestones,
                { ID },
                "Milestone not found"
            );

            await DELETE
                .from(Milestones)
                .where({ ID });

            return "Milestone deleted successfully";
        }
    );

    /* Tasks */

    this.on(
        "createTask",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            await getOne(
                req,
                Milestones,
                {
                    ID: data.milestoneID
                },
                "Milestone not found"
            );

            if (
                Number(
                    data.estimatedHours ||
                    0
                ) <= 0
            ) {
                req.reject(
                    400,
                    "Estimated hours must be greater than zero"
                );
            }

            await INSERT
                .into(Tasks)
                .entries({
                    ID,
                    milestone_ID:
                        data.milestoneID,
                    taskName:
                        data.taskName,
                    startDate:
                        data.startDate,
                    endDate:
                        data.endDate,
                    status:
                        data.status ||
                        "NotStarted",
                    estimatedHours:
                        data.estimatedHours,
                    actualHours:
                        data.actualHours ??
                        0
                });

            return SELECT.one
                .from(Tasks)
                .where({ ID });
        }
    );

    this.on(
        "updateTask",
        async (req) => {
            const {
                ID,
                taskName,
                startDate,
                endDate,
                status,
                estimatedHours,
                actualHours
            } = req.data;

            await getOne(
                req,
                Tasks,
                { ID },
                "Task not found"
            );

            await UPDATE(Tasks)
                .set(
                    cleanData({
                        taskName,
                        startDate,
                        endDate,
                        status,
                        estimatedHours,
                        actualHours
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Tasks)
                .where({ ID });
        }
    );

    this.on(
        "deleteTask",
        async (req) => {
            const { ID } = req.data;

            await getOne(
                req,
                Tasks,
                { ID },
                "Task not found"
            );

            await DELETE
                .from(Tasks)
                .where({ ID });

            return "Task deleted successfully";
        }
    );

    /* Timesheets */

    this.on(
        "createTimesheet",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            await getOne(
                req,
                Employees,
                {
                    ID: data.employeeID
                },
                "Employee not found"
            );

            if (
                data.weekStartDate &&
                data.weekEndDate &&
                data.weekEndDate <
                    data.weekStartDate
            ) {
                req.reject(
                    400,
                    "Week end date cannot be before week start date"
                );
            }

            await INSERT
                .into(Timesheets)
                .entries(
                    cleanData({
                        ID,
                        employee_ID:
                            data.employeeID,
                        approvedBy_ID:
                            data.approvedByID,
                        invoice_ID:
                            data.invoiceID,
                        weekStartDate:
                            data.weekStartDate,
                        weekEndDate:
                            data.weekEndDate,
                        totalBillableHours:
                            data.totalBillableHours ??
                            0,
                        submittedDate:
                            data.submittedDate,
                        approvedDate:
                            data.approvedDate,
                        status:
                            data.status ||
                            "Draft"
                    })
                );

            return SELECT.one
                .from(Timesheets)
                .where({ ID });
        }
    );

    this.on(
        "updateTimesheet",
        async (req) => {
            const {
                ID,
                approvedByID,
                invoiceID,
                weekStartDate,
                weekEndDate,
                totalBillableHours,
                submittedDate,
                approvedDate,
                status
            } = req.data;

            const current =
                await getOne(
                    req,
                    Timesheets,
                    { ID },
                    "Timesheet not found"
                );

            if (
                [
                    "Submitted",
                    "Approved",
                    "Invoiced"
                ].includes(current.status)
            ) {
                req.reject(
                    400,
                    "Submitted, approved, or invoiced Timesheets cannot be edited"
                );
            }

            if (
                weekStartDate &&
                weekEndDate &&
                weekEndDate <
                    weekStartDate
            ) {
                req.reject(
                    400,
                    "Week end date cannot be before week start date"
                );
            }

            await UPDATE(Timesheets)
                .set(
                    cleanData({
                        approvedBy_ID:
                            approvedByID,
                        invoice_ID:
                            invoiceID,
                        weekStartDate,
                        weekEndDate,
                        totalBillableHours,
                        submittedDate,
                        approvedDate,
                        status
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Timesheets)
                .where({ ID });
        }
    );

    this.on(
        "deleteTimesheet",
        async (req) => {
            const { ID } = req.data;

            const current =
                await getOne(
                    req,
                    Timesheets,
                    { ID },
                    "Timesheet not found"
                );

            if (
                current.status !==
                    "Draft" &&
                current.status !==
                    "Rejected"
            ) {
                req.reject(
                    400,
                    "Only draft or rejected Timesheets can be deleted"
                );
            }

            await DELETE
                .from(TimesheetEntries)
                .where({
                    timesheet_ID: ID
                });

            await DELETE
                .from(Timesheets)
                .where({ ID });

            return "Timesheet deleted successfully";
        }
    );

    this.on(
        "submitTimesheet",
        "Timesheets",
        async (req) => {
            const ID = boundID(req);

            const timesheet =
                await getOne(
                    req,
                    Timesheets,
                    { ID },
                    "Timesheet not found"
                );

            if (
                ![
                    "Draft",
                    "Rejected"
                ].includes(
                    timesheet.status
                )
            ) {
                req.reject(
                    400,
                    "Only draft or rejected Timesheets can be submitted"
                );
            }

            const entries =
                await SELECT
                    .from(
                        TimesheetEntries
                    )
                    .where({
                        timesheet_ID: ID
                    });

            if (!entries.length) {
                req.reject(
                    400,
                    "No Timesheet Entries were found"
                );
            }

            const dailyTotals = {};

            for (const entry of entries) {
                const workDate =
                    String(entry.workDate);

                const hours =
                    Number(
                        entry.hours || 0
                    );

                if (
                    hours < 0.25 ||
                    hours > 24
                ) {
                    req.reject(
                        400,
                        `Hours must be between 0.25 and 24 on ${workDate}`
                    );
                }

                dailyTotals[workDate] =
                    (
                        dailyTotals[
                            workDate
                        ] || 0
                    ) +
                    hours;

                if (
                    dailyTotals[
                        workDate
                    ] > 24
                ) {
                    req.reject(
                        400,
                        `Daily hours exceed 24 on ${workDate}`
                    );
                }
            }

            const totalBillableHours =
                entries
                    .filter(
                        (entry) =>
                            entry.billable ===
                            true
                    )
                    .reduce(
                        (
                            total,
                            entry
                        ) =>
                            total +
                            Number(
                                entry.hours ||
                                0
                            ),
                        0
                    );

            await UPDATE(Timesheets)
                .set({
                    status:
                        "Submitted",
                    submittedDate:
                        dateOnly(),
                    approvedDate:
                        null,
                    rejectionReason:
                        null,
                    totalBillableHours:
                        Number(
                            totalBillableHours
                                .toFixed(2)
                        )
                })
                .where({ ID });

            return SELECT.one
                .from(Timesheets)
                .where({ ID });
        }
    );

    this.on(
        "approveTimesheet",
        "Timesheets",
        async (req) => {
            const ID = boundID(req);

            const timesheet =
                await getOne(
                    req,
                    Timesheets,
                    { ID },
                    "Timesheet not found"
                );

            if (
                timesheet.status !==
                "Submitted"
            ) {
                req.reject(
                    400,
                    "Only submitted Timesheets can be approved"
                );
            }

            const entries =
                await SELECT
                    .from(
                        TimesheetEntries
                    )
                    .where({
                        timesheet_ID: ID
                    });

            if (!entries.length) {
                req.reject(
                    400,
                    "The Timesheet has no entries"
                );
            }

            const totalBillableHours =
                entries
                    .filter(
                        (entry) =>
                            entry.billable ===
                            true
                    )
                    .reduce(
                        (
                            total,
                            entry
                        ) =>
                            total +
                            Number(
                                entry.hours ||
                                0
                            ),
                        0
                    );

            await UPDATE(Timesheets)
                .set({
                    status:
                        "Approved",
                    approvedDate:
                        dateOnly(),
                    totalBillableHours:
                        Number(
                            totalBillableHours
                                .toFixed(2)
                        ),
                    rejectionReason:
                        null
                })
                .where({ ID });

            await recalculateProjectsForTimesheet(
                ID
            );

            return SELECT.one
                .from(Timesheets)
                .where({ ID });
        }
    );

    this.on(
        "rejectTimesheet",
        "Timesheets",
        async (req) => {
            const ID = boundID(req);

            const reason = String(
                req.data.reason || ""
            ).trim();

            const timesheet =
                await getOne(
                    req,
                    Timesheets,
                    { ID },
                    "Timesheet not found"
                );

            if (
                timesheet.status !==
                "Submitted"
            ) {
                req.reject(
                    400,
                    "Only submitted Timesheets can be rejected"
                );
            }

            if (!reason) {
                req.reject(
                    400,
                    "Rejection reason is mandatory"
                );
            }

            await UPDATE(Timesheets)
                .set({
                    status:
                        "Rejected",
                    rejectionReason:
                        reason,
                    approvedDate:
                        null
                })
                .where({ ID });

            await recalculateProjectsForTimesheet(
                ID
            );

            return SELECT.one
                .from(Timesheets)
                .where({ ID });
        }
    );

    /* Timesheet Entries */

    this.on(
        "createTimesheetEntry",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            const timesheet =
                await getOne(
                    req,
                    Timesheets,
                    {
                        ID:
                            data.timesheetID
                    },
                    "Timesheet not found"
                );

            if (
                timesheet.status !==
                    "Draft" &&
                timesheet.status !==
                    "Rejected"
            ) {
                req.reject(
                    400,
                    "Entries can only be added to draft or rejected Timesheets"
                );
            }

            const task =
                await getOne(
                    req,
                    Tasks,
                    {
                        ID: data.taskID
                    },
                    "Task not found"
                );

            if (
                [
                    "Done",
                    "Completed"
                ].includes(task.status)
            ) {
                req.reject(
                    400,
                    "Time cannot be logged against a completed Task"
                );
            }

            const hours = Number(
                data.hours || 0
            );

            if (
                hours < 0.25 ||
                hours > 24
            ) {
                req.reject(
                    400,
                    "Hours must be between 0.25 and 24"
                );
            }

            if (
                data.workDate <
                    timesheet.weekStartDate ||
                data.workDate >
                    timesheet.weekEndDate
            ) {
                req.reject(
                    400,
                    "Work date must be inside the Timesheet week"
                );
            }

            const duplicate =
                await SELECT.one
                    .from(
                        TimesheetEntries
                    )
                    .where({
                        timesheet_ID:
                            data.timesheetID,
                        task_ID:
                            data.taskID,
                        workDate:
                            data.workDate
                    });

            if (duplicate) {
                req.reject(
                    409,
                    "An Entry already exists for this Task and work date"
                );
            }

            const dailyEntries =
                await SELECT
                    .from(
                        TimesheetEntries
                    )
                    .where({
                        timesheet_ID:
                            data.timesheetID,
                        workDate:
                            data.workDate
                    });

            const currentDailyHours =
                dailyEntries.reduce(
                    (
                        total,
                        entry
                    ) =>
                        total +
                        Number(
                            entry.hours ||
                            0
                        ),
                    0
                );

            if (
                currentDailyHours +
                hours >
                24
            ) {
                req.reject(
                    400,
                    "Daily hours cannot exceed 24"
                );
            }

            await INSERT
                .into(
                    TimesheetEntries
                )
                .entries({
                    ID,
                    timesheet_ID:
                        data.timesheetID,
                    task_ID:
                        data.taskID,
                    workDate:
                        data.workDate,
                    hours,
                    billable:
                        data.billable !==
                        false
                });

            return SELECT.one
                .from(
                    TimesheetEntries
                )
                .where({ ID });
        }
    );

    this.on(
        "updateTimesheetEntry",
        async (req) => {
            const {
                ID,
                workDate,
                hours,
                billable
            } = req.data;

            const entry =
                await getOne(
                    req,
                    TimesheetEntries,
                    { ID },
                    "Timesheet Entry not found"
                );

            const timesheet =
                await getOne(
                    req,
                    Timesheets,
                    {
                        ID:
                            entry.timesheet_ID
                    },
                    "Parent Timesheet not found"
                );

            if (
                timesheet.status !==
                    "Draft" &&
                timesheet.status !==
                    "Rejected"
            ) {
                req.reject(
                    400,
                    "Entries can only be changed while the Timesheet is Draft or Rejected"
                );
            }

            if (
                hours !== undefined &&
                (
                    Number(hours) <
                        0.25 ||
                    Number(hours) >
                        24
                )
            ) {
                req.reject(
                    400,
                    "Hours must be between 0.25 and 24"
                );
            }

            if (
                workDate &&
                (
                    workDate <
                        timesheet
                            .weekStartDate ||
                    workDate >
                        timesheet
                            .weekEndDate
                )
            ) {
                req.reject(
                    400,
                    "Work date must be inside the Timesheet week"
                );
            }

            await UPDATE(
                TimesheetEntries
            )
                .set(
                    cleanData({
                        workDate,
                        hours,
                        billable
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(
                    TimesheetEntries
                )
                .where({ ID });
        }
    );

    this.on(
        "deleteTimesheetEntry",
        async (req) => {
            const { ID } = req.data;

            const entry =
                await getOne(
                    req,
                    TimesheetEntries,
                    { ID },
                    "Timesheet Entry not found"
                );

            const timesheet =
                await getOne(
                    req,
                    Timesheets,
                    {
                        ID:
                            entry.timesheet_ID
                    },
                    "Parent Timesheet not found"
                );

            if (
                timesheet.status !==
                    "Draft" &&
                timesheet.status !==
                    "Rejected"
            ) {
                req.reject(
                    400,
                    "Entries can only be deleted while the Timesheet is Draft or Rejected"
                );
            }

            await DELETE
                .from(
                    TimesheetEntries
                )
                .where({ ID });

            return "Timesheet Entry deleted successfully";
        }
    );

    /* Invoices */

    this.on(
        "createInvoice",
        async (req) => {
            const data = req.data;
            const ID = cds.utils.uuid();

            await getOne(
                req,
                Projects,
                {
                    ID: data.projectID
                },
                "Project not found"
            );

            await getOne(
                req,
                Clients,
                {
                    ID: data.clientID
                },
                "Client not found"
            );

            await INSERT
                .into(Invoices)
                .entries({
                    ID,
                    invoiceNumber:
                        data.invoiceNumber,
                    project_ID:
                        data.projectID,
                    client_ID:
                        data.clientID,
                    invoiceDate:
                        data.invoiceDate,
                    dueDate:
                        data.dueDate,
                    billableHours:
                        data.billableHours,
                    totalAmount:
                        data.totalAmount,
                    taxAmount:
                        data.taxAmount,
                    currencyCode:
                        data.currencyCode,
                    paymentStatus:
                        data.paymentStatus ||
                        "Draft",
                    status:
                        data.status ||
                        "Draft"
                });

            return SELECT.one
                .from(Invoices)
                .where({ ID });
        }
    );

    this.on(
        "updateInvoice",
        async (req) => {
            const {
                ID,
                invoiceDate,
                dueDate,
                billableHours,
                totalAmount,
                taxAmount,
                paymentStatus,
                status
            } = req.data;

            await getOne(
                req,
                Invoices,
                { ID },
                "Invoice not found"
            );

            await UPDATE(Invoices)
                .set(
                    cleanData({
                        invoiceDate,
                        dueDate,
                        billableHours,
                        totalAmount,
                        taxAmount,
                        paymentStatus,
                        status
                    })
                )
                .where({ ID });

            return SELECT.one
                .from(Invoices)
                .where({ ID });
        }
    );

    this.on(
        "deleteInvoice",
        async (req) => {
            const { ID } = req.data;

            const invoice =
                await getOne(
                    req,
                    Invoices,
                    { ID },
                    "Invoice not found"
                );

            if (
                invoice.status !==
                    "Draft" ||
                invoice.paymentStatus !==
                    "Draft"
            ) {
                req.reject(
                    400,
                    "Only draft Invoices can be deleted"
                );
            }

            await DELETE
                .from(Invoices)
                .where({ ID });

            return "Invoice deleted successfully";
        }
    );

    this.on(
        "generateInvoice",
        "Projects",
        async (req) => {
            const projectID =
                boundID(req);

            const project =
                await getOne(
                    req,
                    Projects,
                    {
                        ID: projectID
                    },
                    "Project not found"
                );

            const budget =
                await getOne(
                    req,
                    Budgets,
                    {
                        project_ID:
                            projectID
                    },
                    "Budget not found"
                );

            if (!project.client_ID) {
                req.reject(
                    400,
                    "The Project has no Client"
                );
            }

            const milestones =
                await SELECT
                    .from(Milestones)
                    .where({
                        project_ID:
                            projectID
                    });

            const taskIDs = new Set();

            for (const milestone of milestones) {
                const tasks =
                    await SELECT
                        .from(Tasks)
                        .where({
                            milestone_ID:
                                milestone.ID
                        });

                tasks.forEach(
                    (task) =>
                        taskIDs.add(
                            task.ID
                        )
                );
            }

            const approvedTimesheets =
                await SELECT
                    .from(Timesheets)
                    .where({
                        status:
                            "Approved",
                        invoice_ID:
                            null
                    });

            const includedTimesheets = [];
            let billableHours = 0;

            for (
                const timesheet
                of approvedTimesheets
            ) {
                const entries =
                    await SELECT
                        .from(
                            TimesheetEntries
                        )
                        .where({
                            timesheet_ID:
                                timesheet.ID
                        });

                const matchingEntries =
                    entries.filter(
                        (entry) =>
                            entry.billable ===
                                true &&
                            taskIDs.has(
                                entry.task_ID
                            )
                    );

                if (
                    matchingEntries.length
                ) {
                    includedTimesheets.push(
                        timesheet
                    );

                    billableHours +=
                        matchingEntries.reduce(
                            (
                                total,
                                entry
                            ) =>
                                total +
                                Number(
                                    entry.hours ||
                                    0
                                ),
                            0
                        );
                }
            }

            if (
                !includedTimesheets.length ||
                billableHours <= 0
            ) {
                req.reject(
                    400,
                    "No approved un-invoiced billable hours were found for this Project"
                );
            }

            billableHours = Number(
                billableHours.toFixed(2)
            );

            const totalAmount = Number(
                (
                    billableHours *
                    Number(
                        budget.billingRateHr ||
                        0
                    )
                ).toFixed(2)
            );

            const taxAmount = Number(
                (
                    totalAmount * 0.18
                ).toFixed(2)
            );

            const invoiceID =
                cds.utils.uuid();

            const invoiceDate =
                new Date();

            const dueDate =
                new Date(invoiceDate);

            dueDate.setDate(
                dueDate.getDate() + 30
            );

            await INSERT
                .into(Invoices)
                .entries({
                    ID:
                        invoiceID,
                    invoiceNumber:
                        `INV-${Date.now()}`,
                    project_ID:
                        projectID,
                    client_ID:
                        project.client_ID,
                    invoiceDate:
                        dateOnly(invoiceDate),
                    dueDate:
                        dateOnly(dueDate),
                    billableHours,
                    totalAmount,
                    taxAmount,
                    currencyCode:
                        budget.currencyCode,
                    paymentStatus:
                        "Draft",
                    status:
                        "Draft"
                });

            for (
                const timesheet
                of includedTimesheets
            ) {
                await UPDATE(
                    Timesheets
                )
                    .set({
                        invoice_ID:
                            invoiceID,
                        status:
                            "Invoiced"
                    })
                    .where({
                        ID:
                            timesheet.ID
                    });
            }

            await recalculateProject(
                projectID
            );

            return SELECT.one
                .from(Invoices)
                .where({
                    ID: invoiceID
                });
        }
    );

    this.on(
    "issue",
    "Invoices",
    async (req) => {
        const ID = boundID(req);

        const invoice =
            await getOne(
                req,
                Invoices,
                { ID },
                "Invoice not found"
            );

        if (
            invoice.status !== "Draft" ||
            invoice.paymentStatus !== "Draft"
        ) {
            req.reject(
                400,
                "Only Draft Invoices can be issued"
            );
        }

        await UPDATE(Invoices)
            .set({
                paymentStatus: "Issued",
                status: "Sent"
            })
            .where({ ID });

        return SELECT.one
            .from(Invoices)
            .where({ ID });
    }
);

this.on(
    "markPaid",
    "Invoices",
    async (req) => {
        const ID = boundID(req);

        const invoice =
            await getOne(
                req,
                Invoices,
                { ID },
                "Invoice not found"
            );

        /*
         * Supports both:
         * New records: status = Sent, paymentStatus = Issued
         * Old records: status = Issued, paymentStatus = Issued
         */
        const isIssued =
            invoice.paymentStatus === "Issued" ||
            invoice.status === "Issued" ||
            invoice.status === "Sent";

        if (!isIssued) {
            req.reject(
                400,
                "Only an issued Invoice can be marked as paid"
            );
        }

        await UPDATE(Invoices)
            .set({
                paymentStatus: "Paid",
                status: "Paid"
            })
            .where({
                ID
            });

        return SELECT.one
            .from(Invoices)
            .where({
                ID
            });
    }
);
    /* Analytics */

    this.on(
        "getBurnSummary",
        async (req) => {
            const { projectID } =
                req.data;

            const project =
                await getOne(
                    req,
                    Projects,
                    {
                        ID: projectID
                    },
                    "Project not found"
                );

            const budget =
                await getOne(
                    req,
                    Budgets,
                    {
                        project_ID:
                            projectID
                    },
                    "Budget not found"
                );

            const budgetAmount =
                Number(
                    budget.budgetAmount ||
                    0
                );

            const consumedAmount =
                Number(
                    budget.consumedAmount ||
                    0
                );

            const burnPercentage =
                budgetAmount > 0
                    ? Number(
                        (
                            consumedAmount /
                            budgetAmount *
                            100
                        ).toFixed(2)
                    )
                    : 0;

            return {
                budgetAmount:
                    budget.budgetAmount,
                consumedAmount:
                    budget.consumedAmount,
                remainingAmount:
                    budget.remainingAmount,
                plannedHours:
                    project.plannedHours,
                consumedHours:
                    project.consumedHours,
                burnPercentage,
                budgetStatus:
                    budget.budgetStatus
            };
        }
    );
});