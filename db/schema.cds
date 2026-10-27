namespace EnterprisePSA.db;

using { managed } from '@sap/cds/common';
using { EnterprisePSA.common as common } from './common';

/* ==========================
   DEPARTMENTS
   ========================== */

entity Departments : managed {
    key ID : UUID;

    departmentName : String(60);
    description    : String(255);

    employees : Association to many Employees
                on employees.department = $self;

    managers : Association to many Managers
               on managers.department = $self;
}

/* ==========================
   EMPLOYEES
   ========================== */

entity Employees : managed {
    key ID : UUID;

    
    firstName    : String(60);
    lastName     : String(60);

    email        : common.Email;
    jobTitle     : String(60);

    joinDate     : Date;
    hourlyRate   : common.Amount;

    status : common.EmployeeStatus default 'Active';

    department : Association to one Departments;

    managerProfile : Association to one Managers;

    timesheets : Composition of many Timesheets
                 on timesheets.employee = $self;
}

/* ==========================
   MANAGERS
   ========================== */

entity Managers : managed {
    key ID : UUID;

    employee : Association to one Employees;

    department : Association to one Departments;

    managerLevel : String(20);

    status : common.EmployeeStatus default 'Active';

    projects : Association to many Projects
               on projects.manager = $self;

    approvedTimesheets : Association to many Timesheets
                         on approvedTimesheets.approvedBy = $self;
}

/* ==========================
   CLIENTS
   ========================== */

entity Clients : managed {
    key ID : UUID;

    clientName    : String(100);
    contactPerson : String(100);

    email       : common.Email;
    phoneNumber : common.PhoneNumber;

    country  : String(50);
    industry : String(50);

    status : common.ClientStatus default 'Active';

    projects : Association to many Projects
               on projects.client = $self;

    invoices : Association to many Invoices
               on invoices.client = $self;
}

/* ==========================
   PROJECTS
   ========================== */

entity Projects : managed {
    key ID : UUID;

    projectCode : String(20);

    projectName : String(100);

    status : common.ProjectStatus default 'Draft';

    billingType : common.BillingType;

    startDate : Date;
    endDate   : Date;

    plannedHours  : Decimal(10,2);
    consumedHours : Decimal(10,2);

    client : Association to one Clients;

    manager : Association to one Managers;

    budget : Composition of one Budgets
             on budget.project = $self;

    milestones : Composition of many Milestones
                 on milestones.project = $self;

    invoices : Composition of many Invoices
               on invoices.project = $self;
}

/* ==========================
   BUDGETS
   ========================== */

entity Budgets : managed {
    key ID : UUID;

    project : Association to one Projects;

    budgetAmount    : common.Amount;
    consumedAmount  : common.Amount;
    remainingAmount : common.Amount;

    billingRateHr : common.Amount;

    currencyCode : common.CurrencyCode;

    budgetStatus : common.BudgetStatus;
}

/* ==========================
   MILESTONES
   ========================== */

entity Milestones : managed {
    key ID : UUID;

    project : Association to one Projects;

    milestoneName : String(100);

    startDate : Date;
    endDate   : Date;

    completionPercent : Decimal(5,2);

    status : common.MilestoneStatus default 'NotStarted';

    tasks : Composition of many Tasks
            on tasks.milestone = $self;
}

/* ==========================
   TASKS
   ========================== */

entity Tasks : managed {
    key ID : UUID;

    milestone : Association to one Milestones;

    taskName : String(100);

    startDate : Date;
    endDate   : Date;

    status : common.TaskStatus default 'NotStarted';

    estimatedHours : Decimal(10,2);
    actualHours    : Decimal(10,2);

    entries : Association to many TimesheetEntries
              on entries.task = $self;
}

/* ==========================
   TIMESHEETS
   ========================== */

entity Timesheets : managed {
    key ID : UUID;

    employee : Association to one Employees;

    approvedBy : Association to one Managers;

    invoice : Association to one Invoices;

    weekStartDate : Date;
    weekEndDate   : Date;
     rejectionReason : String(255);

    totalBillableHours : Decimal(10,2);

    submittedDate : Date;
    approvedDate  : Date;
   
    status : common.TimesheetStatus default 'Draft';

    entries : Composition of many TimesheetEntries
              on entries.timesheet = $self;
}

/* ==========================
   TIMESHEET ENTRIES
   ========================== */

entity TimesheetEntries : managed {
    key ID : UUID;

    timesheet : Association to one Timesheets;

    task : Association to one Tasks;

    workDate : Date;

    hours : Decimal(4,2);

    billable : Boolean default true;
}

/* ==========================
   INVOICES
   ========================== */

entity Invoices : managed {
    key ID : UUID;

    invoiceNumber : String(30);

    project : Association to one Projects;

    client : Association to one Clients;

    invoiceDate : Date;
    dueDate     : Date;
    

    billableHours : Decimal(10,2);

    totalAmount : common.Amount;
    taxAmount   : common.Amount;

    currencyCode : common.CurrencyCode;

    paymentStatus : String(20);

    status : common.InvoiceStatus default 'Draft';

    timesheets : Association to many Timesheets
                 on timesheets.invoice = $self;
}



// namespace EnterprisePSA.db;

// using { managed } from '@sap/cds/common';
// using { EnterprisePSA.common as common } from './common';

// /* ==========================
//    DEPARTMENTS
//    ========================== */

// entity Departments : managed {
//     key ID : UUID;

//     departmentName : String(60);
//     description    : String(255);
// }

// /* ==========================
//    EMPLOYEES
//    ========================== */

// entity Employees : managed {
//     key ID : UUID;

//     employeeCode : String(20);

//     firstName : String(60);
//     lastName  : String(60);

//     email      : common.Email;
//     jobTitle   : String(60);
//     joinDate   : Date;
//     hourlyRate : common.Amount;

//     status : common.EmployeeStatus default 'Active';

//     department : Association to Departments;
// }

// /* ==========================
//    MANAGERS
//    ========================== */

// entity Managers : managed {
//     key ID : UUID;

//     employee : Association to Employees;

//     department : Association to Departments;

//     managerLevel : String(20);

//     status : common.EmployeeStatus default 'Active';
// }

// /* ==========================
//    CLIENTS
//    ========================== */

// entity Clients : managed {
//     key ID : UUID;

//     clientName    : String(100);
//     contactPerson : String(100);

//     email       : common.Email;
//     phoneNumber : common.PhoneNumber;

//     country  : String(50);
//     industry : String(50);

//     status : common.ClientStatus default 'Active';
// }

// /* ==========================
//    PROJECTS
//    ========================== */

// entity Projects : managed {
//     key ID : UUID;

//     projectCode : String(20);

//     projectName : String(100);

//     billingType : common.BillingType;

//     startDate : Date;
//     endDate   : Date;

//     plannedHours  : Decimal(10,2);
//     consumedHours : Decimal(10,2);

//     status : common.ProjectStatus default 'Draft';

//     client  : Association to Clients;
//     manager : Association to Managers;

//     budget : Composition of one Budgets
//              on budget.project = $self;

//     milestones : Composition of many Milestones
//                  on milestones.project = $self;

//     invoices : Composition of many Invoices
//                on invoices.project = $self;
// }

// /* ==========================
//    BUDGETS
//    ========================== */

// entity Budgets : managed {
//     key ID : UUID;

//     project : Association to Projects;

//     budgetAmount    : common.Amount;
//     consumedAmount  : common.Amount;
//     remainingAmount : common.Amount;

//     billingRateHr : common.Amount;

//     currencyCode : common.CurrencyCode;

//     budgetStatus : common.BudgetStatus;
// }

// /* ==========================
//    MILESTONES
//    ========================== */

// entity Milestones : managed {
//     key ID : UUID;

//     project : Association to Projects;

//     milestoneName : String(100);

//     startDate : Date;
//     endDate   : Date;

//     completionPercent : Decimal(5,2);

//     status : common.MilestoneStatus default 'NotStarted';

//     tasks : Composition of many Tasks
//             on tasks.milestone = $self;
// }

// /* ==========================
//    TASKS
//    ========================== */

// entity Tasks : managed {
//     key ID : UUID;

//     milestone : Association to Milestones;

//     taskName : String(100);

//     startDate : Date;
//     endDate   : Date;

//     estimatedHours : Decimal(10,2);
//     actualHours    : Decimal(10,2);

//     status : common.TaskStatus default 'NotStarted';
// }

// /* ==========================
//    TIMESHEETS
//    ========================== */

// entity Timesheets : managed {
//     key ID : UUID;

//     employee : Association to Employees;

//     approvedBy : Association to Managers;

//     invoice : Association to Invoices;

//     weekStartDate : Date;
//     weekEndDate   : Date;

//     totalBillableHours : Decimal(10,2);

//     submittedDate : Date;
//     approvedDate  : Date;

//     status : common.TimesheetStatus default 'Draft';

//     entries : Composition of many TimesheetEntries
//               on entries.timesheet = $self;
// }

// /* ==========================
//    TIMESHEET ENTRIES
//    ========================== */

// entity TimesheetEntries : managed {
//     key ID : UUID;

//     timesheet : Association to Timesheets;

//     task : Association to Tasks;

//     workDate : Date;

//     hours : Decimal(4,2);

//     billable : Boolean default true;
// }

// /* ==========================
//    INVOICES
//    ========================== */

// entity Invoices : managed {
//     key ID : UUID;

//     invoiceNumber : String(30);

//     project : Association to Projects;

//     client : Association to Clients;

//     invoiceDate : Date;
//     dueDate     : Date;

//     billableHours : Decimal(10,2);

//     totalAmount : common.Amount;
//     taxAmount   : common.Amount;

//     currencyCode : common.CurrencyCode;

//     paymentStatus : String(20);

//     status : common.InvoiceStatus default 'Draft';
// }