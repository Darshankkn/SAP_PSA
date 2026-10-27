using { EnterprisePSA.db as db } from '../db/schema';

service CatalogService {

    /* =====================================================
       DEPARTMENTS
       ===================================================== */

    entity DepartmentSRV
        as projection on db.Departments;

    action createDepartment(
        departmentName : String(60),
        description    : String(255)
    ) returns DepartmentSRV;

    action updateDepartment(
        ID             : UUID,
        departmentName : String(60),
        description    : String(255)
    ) returns DepartmentSRV;

    action deleteDepartment(
        ID : UUID
    ) returns String;


    /* =====================================================
       EMPLOYEES
       ===================================================== */

    entity Employees
        as projection on db.Employees;

    action createEmployee(
        firstName    : String(60),
        lastName     : String(60),
        email        : String(100),
        jobTitle     : String(60),
        joinDate     : Date,
        hourlyRate   : Decimal(15,2),
        status       : String(20),
        departmentID : UUID
    ) returns Employees;

    action updateEmployee(
        ID         : UUID,
        firstName  : String(60),
        lastName   : String(60),
        email      : String(100),
        jobTitle   : String(60),
        hourlyRate : Decimal(15,2),
        status     : String(20)
    ) returns Employees;

    action deleteEmployee(
        ID : UUID
    ) returns String;


    /* =====================================================
       MANAGERS
       ===================================================== */

    entity Managers
        as projection on db.Managers;

    action createManager(
        employeeID   : UUID,
        departmentID : UUID,
        managerLevel : String(20),
        status       : String(20)
    ) returns Managers;

    action updateManager(
        ID           : UUID,
        managerLevel : String(20),
        status       : String(20)
    ) returns Managers;

    action deleteManager(
        ID : UUID
    ) returns String;


    /* =====================================================
       CLIENTS
       ===================================================== */

    entity Clients
        as projection on db.Clients;

    action createClient(
        clientName    : String(100),
        contactPerson : String(100),
        email         : String(100),
        phoneNumber   : String(20),
        country       : String(50),
        industry      : String(50),
        status        : String(20)
    ) returns Clients;

    action updateClient(
        ID            : UUID,
        clientName    : String(100),
        contactPerson : String(100),
        email         : String(100),
        phoneNumber   : String(20),
        country       : String(50),
        industry      : String(50),
        status        : String(20)
    ) returns Clients;

    action deleteClient(
        ID : UUID
    ) returns String;


    /* =====================================================
       PROJECTS
       ===================================================== */

    entity Projects
        as projection on db.Projects
        actions {

            action recalculateBudget()
                returns Budgets;

            action generateInvoice()
                returns Invoices;
        };

    action createProject(
        projectCode   : String(20),
        projectName   : String(100),
        status        : String(20),
        billingType   : String(20),
        startDate     : Date,
        endDate       : Date,
        plannedHours  : Decimal(10,2),
        consumedHours : Decimal(10,2),
        clientID      : UUID,
        managerID     : UUID
    ) returns Projects;

    action updateProject(
        ID            : UUID,
        projectName   : String(100),
        status        : String(20),
        billingType   : String(20),
        startDate     : Date,
        endDate       : Date,
        plannedHours  : Decimal(10,2),
        consumedHours : Decimal(10,2)
    ) returns Projects;

    action deleteProject(
        ID : UUID
    ) returns String;


    /* =====================================================
       BUDGETS
       ===================================================== */

    entity Budgets
        as projection on db.Budgets;

    action createBudget(
        projectID       : UUID,
        budgetAmount    : Decimal(15,2),
        consumedAmount  : Decimal(15,2),
        remainingAmount : Decimal(15,2),
        billingRateHr   : Decimal(15,2),
        currencyCode    : String(3),
        budgetStatus    : String(20)
    ) returns Budgets;

    action updateBudget(
        ID              : UUID,
        budgetAmount    : Decimal(15,2),
        consumedAmount  : Decimal(15,2),
        remainingAmount : Decimal(15,2),
        billingRateHr   : Decimal(15,2),
        budgetStatus    : String(20)
    ) returns Budgets;

    action deleteBudget(
        ID : UUID
    ) returns String;


    /* =====================================================
       MILESTONES
       ===================================================== */

    entity Milestones
        as projection on db.Milestones;

    action createMilestone(
        projectID         : UUID,
        milestoneName     : String(100),
        startDate         : Date,
        endDate           : Date,
        completionPercent : Decimal(5,2),
        status            : String(20)
    ) returns Milestones;

    action updateMilestone(
        ID                : UUID,
        milestoneName     : String(100),
        startDate         : Date,
        endDate           : Date,
        completionPercent : Decimal(5,2),
        status            : String(20)
    ) returns Milestones;

    action deleteMilestone(
        ID : UUID
    ) returns String;


    /* =====================================================
       TASKS
       ===================================================== */

    entity Tasks
        as projection on db.Tasks;

    action createTask(
        milestoneID    : UUID,
        taskName       : String(100),
        startDate      : Date,
        endDate        : Date,
        status         : String(20),
        estimatedHours : Decimal(10,2),
        actualHours    : Decimal(10,2)
    ) returns Tasks;

    action updateTask(
        ID             : UUID,
        taskName       : String(100),
        startDate      : Date,
        endDate        : Date,
        status         : String(20),
        estimatedHours : Decimal(10,2),
        actualHours    : Decimal(10,2)
    ) returns Tasks;

    action deleteTask(
        ID : UUID
    ) returns String;


    /* =====================================================
       TIMESHEETS
       ===================================================== */

    entity Timesheets
        as projection on db.Timesheets
        actions {

            action submitTimesheet()
                returns Timesheets;

            action approveTimesheet()
                returns Timesheets;

            action rejectTimesheet(
                reason : String(255)
            ) returns Timesheets;
        };

    action createTimesheet(
        employeeID         : UUID,
        approvedByID       : UUID,
        invoiceID          : UUID,
        weekStartDate      : Date,
        weekEndDate        : Date,
        totalBillableHours : Decimal(10,2),
        submittedDate      : Date,
        approvedDate       : Date,
        status             : String(20)
    ) returns Timesheets;

    action updateTimesheet(
        ID                 : UUID,
        approvedByID       : UUID,
        invoiceID          : UUID,
        totalBillableHours : Decimal(10,2),
        submittedDate      : Date,
        approvedDate       : Date,
        status             : String(20)
    ) returns Timesheets;

    action deleteTimesheet(
        ID : UUID
    ) returns String;


    /* =====================================================
       TIMESHEET ENTRIES
       ===================================================== */

    entity TimesheetEntries
        as projection on db.TimesheetEntries;

    action createTimesheetEntry(
        timesheetID : UUID,
        taskID      : UUID,
        workDate    : Date,
        hours       : Decimal(4,2),
        billable    : Boolean
    ) returns TimesheetEntries;

    action updateTimesheetEntry(
        ID       : UUID,
        workDate : Date,
        hours    : Decimal(4,2),
        billable : Boolean
    ) returns TimesheetEntries;

    action deleteTimesheetEntry(
        ID : UUID
    ) returns String;


    /* =====================================================
       INVOICES
       ===================================================== */

    entity Invoices
        as projection on db.Invoices
        actions {

            action issue()
                returns Invoices;

            action markPaid()
                returns Invoices;
        };

    action createInvoice(
        invoiceNumber : String(30),
        projectID     : UUID,
        clientID      : UUID,
        invoiceDate   : Date,
        dueDate       : Date,
        billableHours : Decimal(10,2),
        totalAmount   : Decimal(15,2),
        taxAmount     : Decimal(15,2),
        currencyCode  : String(3),
        paymentStatus : String(20),
        status        : String(20)
    ) returns Invoices;

    action updateInvoice(
        ID            : UUID,
        invoiceDate   : Date,
        dueDate       : Date,
        billableHours : Decimal(10,2),
        totalAmount   : Decimal(15,2),
        taxAmount     : Decimal(15,2),
        paymentStatus : String(20),
        status        : String(20)
    ) returns Invoices;

    action deleteInvoice(
        ID : UUID
    ) returns String;


    /* =====================================================
       ANALYTICS FUNCTION
       ===================================================== */

    function getBurnSummary(
        projectID : UUID
    ) returns BurnSummary;
}


/* =====================================================
   CUSTOM RETURN TYPE
   ===================================================== */

type BurnSummary {
    budgetAmount    : Decimal(15,2);
    consumedAmount  : Decimal(15,2);
    remainingAmount : Decimal(15,2);
    plannedHours    : Decimal(10,2);
    consumedHours   : Decimal(10,2);
    burnPercentage  : Decimal(5,2);
    budgetStatus    : String(20);
}