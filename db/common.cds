namespace EnterprisePSA.common;

/* ==========================
   PROJECT STATUS
   ========================== */

type ProjectStatus : String enum {
    Draft;
    Active;
    OnHold;
    Completed;
    Cancelled;
};

/* ==========================
   TIMESHEET STATUS
   ========================== */

type TimesheetStatus : String enum {
    Draft;
    Submitted;
    Approved;
    Rejected;
};

/* ==========================
   INVOICE STATUS
   ========================== */

type InvoiceStatus : String enum {
    Draft;
    Sent;
    Paid;
    Overdue;
    Cancelled;
};

/* ==========================
   EMPLOYEE STATUS
   ========================== */

type EmployeeStatus : String enum {
    Active;
    Inactive;
    OnLeave;
    Terminated;
};

/* ==========================
   BUDGET STATUS
   ========================== */

type BudgetStatus : String enum {
    Draft;
    Approved;
    Revised;
    Closed;
};

/* ==========================
   MILESTONE STATUS
   ========================== */

type MilestoneStatus : String enum {
    NotStarted;
    InProgress;
    Completed;
    Delayed;
};

/* ==========================
   TASK STATUS
   ========================== */

type TaskStatus : String enum {
    NotStarted;
    InProgress;
    Completed;
    Blocked;
};

/* ==========================
   CLIENT STATUS
   ========================== */

type ClientStatus : String enum {
    Active;
    Inactive;
};

/* ==========================
   BILLING TYPE
   ========================== */

type BillingType : String enum {
    FixedPrice;
    TimeAndMaterial;
    ResourceBased;
};

/* ==========================
   CURRENCY CODE
   ========================== */

type CurrencyCode : String(3);

/* ==========================
   AMOUNT
   ========================== */

type Amount : Decimal(15,2);

/* ==========================
   EMAIL
   ========================== */

type Email : String(255);

/* ==========================
   PHONE NUMBER
   ========================== */

type PhoneNumber : String(20);