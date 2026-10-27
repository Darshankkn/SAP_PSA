# EnterprisePSA: Architecture, Data Models & Business Workflows

**Version:** 1.0.0  
**Target Environment:** SAP Cloud Application Programming Model (Node.js) & SAP HANA Cloud  
**UI Framework:** SAPUI5 (Freestyle & Fiori Elements)  
**Protocol:** OData V4  

---

## 1. System Architecture Overview

EnterprisePSA is an enterprise-grade Professional Services Automation (PSA) platform engineered with the **SAP Cloud Application Programming Model (CAP)** on Node.js and backed by **SAP HANA Cloud**. The system provides end-to-end lifecycle management for client projects, resource staffing, milestone tracking, timesheet logging, manager approvals, financial billing, and accounts receivable.

```mermaid
flowchart TD
    subgraph UI_Layer["Presentation Layer (SAPUI5 / SAP Fiori)"]
        Hub["Dashboard Hub (Freestyle)"]
        EmpApp["Employee Dashboard (Freestyle)"]
        MgrApp["Manager Dashboard (Freestyle)"]
        AdminApp["Admin & Finance Dashboard (Freestyle)"]
        FE2["Projects App (Fiori Elements)"]
        FE3["Timesheets App (Fiori Elements)"]
        FE4["Invoices App (Fiori Elements)"]
    end

    subgraph Service_Layer["Service & Business Logic Layer (CAP Node.js)"]
        CatSrv["CatalogService (/odata/v4/catalog)"]
        AuthHandler["Security & Context Handlers"]
        ActionHandlers["Custom Action Handlers (srv/cat-service.js)"]
        EventHandlers["CRUD Lifecycle Hooks (srv/cat-service.js)"]
    end

    subgraph DB_Layer["Persistence Layer (SAP HANA Cloud)"]
        HDI["SAP HANA HDI Container"]
        Tables[("11 Core Entities + Associations")]
    end

    Hub --> EmpApp & MgrApp & AdminApp
    EmpApp & MgrApp & AdminApp --> CatSrv
    FE2 & FE3 & FE4 --> CatSrv
    CatSrv --> AuthHandler --> ActionHandlers & EventHandlers
    ActionHandlers & EventHandlers --> HDI --> Tables
```

### Architectural Key Characteristics:
1. **OData V4 Native**: All services are served via the OData V4 protocol at `/odata/v4/catalog`, enabling batch requests, complex expansions, and bound/unbound actions.
2. **Hybrid Presentation Tier**:
   - **Freestyle SAPUI5 Applications**: Tailored for high-interactivity personas (`app/dashboardhub`, `app/employeed`, `app/manager`, `app/admin`).
   - **SAP Fiori Elements Applications**: Standard metadata-driven List Report and Object Page applications (`app/project2`, `app/project3`, `app/project4`).
3. **Database Independence with HANA Optimization**: CDS definitions in `db/schema.cds` compile natively to SAP HANA HDI container table definitions and calculation views via `@cap-js/hana`.

---

## 2. Entity-Relationship Model (Domain Architecture)

EnterprisePSA consists of 11 tightly coupled domain entities organized across Organizational Structure, Project Delivery, Time Recording, and Financials.

```mermaid
erDiagram
    Departments ||--o{ Employees : employs
    Departments ||--o{ Managers : contains
    Employees ||--o| Managers : "is profile of"
    Managers ||--o{ Employees : manages
    Managers ||--o{ Projects : leads
    Clients ||--o{ Projects : commissions
    Clients ||--o{ Invoices : billed_to
    Projects ||--|| Budgets : allocated
    Projects ||--o{ Milestones : contains
    Projects ||--o{ Invoices : generates
    Milestones ||--o{ Tasks : decomposes_into
    Tasks ||--o{ TimesheetEntries : recorded_against
    Timesheets ||--o{ TimesheetEntries : contains
    Employees ||--o{ Timesheets : submits
```

### Entity Schema Summary

| Entity | Primary Key | Key Attributes | Core Associations |
| :--- | :--- | :--- | :--- |
| **`Departments`** | `ID` (UUID) | `name`, `code`, `description` | `employees`, `managers` |
| **`Employees`** | `ID` (UUID) | `firstName`, `lastName`, `email`, `role`, `hourlyRate`, `status` | `department`, `managerProfile`, `timesheets` |
| **`Managers`** | `ID` (UUID) | `department_ID`, `employee_ID`, `approvalLimit`, `level` | `department`, `employeeProfile`, `projects`, `directReports` |
| **`Clients`** | `ID` (UUID) | `name`, `industry`, `contactEmail`, `paymentTerms`, `creditRating` | `projects`, `invoices` |
| **`Projects`** | `ID` (UUID) | `name`, `code`, `startDate`, `endDate`, `status`, `currency` | `client`, `manager`, `budget`, `milestones`, `invoices` |
| **`Budgets`** | `ID` (UUID) | `totalAmount`, `spentAmount`, `remainingAmount`, `laborBudget` | `project` |
| **`Milestones`** | `ID` (UUID) | `name`, `targetDate`, `completionDate`, `status`, `weight` | `project`, `tasks` |
| **`Tasks`** | `ID` (UUID) | `title`, `estimatedHours`, `actualHours`, `billable`, `status` | `milestone`, `assignedTo`, `timesheetEntries` |
| **`Timesheets`** | `ID` (UUID) | `weekStartDate`, `weekEndDate`, `totalHours`, `status`, `rejectionReason` | `employee`, `entries` |
| **`TimesheetEntries`** | `ID` (UUID) | `workDate`, `hours`, `description`, `billable` | `timesheet`, `task` |
| **`Invoices`** | `ID` (UUID) | `invoiceNumber`, `subtotal`, `taxAmount`, `totalAmount`, `status`, `paymentStatus` | `project`, `client` |

---

## 3. End-to-End Business Workflows

### Workflow 1: Employee Timesheet Submission, Manager Approval & Billing Generation

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Employee (UI)
    actor Mgr as Project Manager (UI)
    actor Fin as Admin / Finance (UI)
    participant Srv as CAP CatalogService
    participant DB as SAP HANA DB

    Note over Emp,DB: 1. Time Tracking & Submission
    Emp->>Srv: POST /odata/v4/catalog/createTimesheetEntry(task, date, hours, billable)
    Srv->>DB: INSERT TimesheetEntries & recalculate Timesheets.totalHours
    Emp->>Srv: POST /odata/v4/catalog/Timesheets(ID)/submitTimesheet()
    Srv->>DB: UPDATE Timesheets SET status = 'Submitted' WHERE status = 'Draft'
    Srv-->>Emp: HTTP 200 OK (Timesheet Submitted)

    Note over Mgr,DB: 2. Manager Review & Approval
    Mgr->>Srv: GET /odata/v4/catalog/Timesheets?$filter=status eq 'Submitted'&$expand=employee,entries
    Srv->>DB: SELECT Timesheets JOIN Employees JOIN TimesheetEntries
    Srv-->>Mgr: Pending Approval Timesheets List
    Mgr->>Srv: POST /odata/v4/catalog/Timesheets(ID)/approveTimesheet()
    Srv->>DB: UPDATE Timesheets SET status = 'Approved', approvedDate = NOW()
    Srv->>DB: Recalculate Tasks.actualHours & Budgets.spentAmount
    Srv-->>Mgr: HTTP 200 OK (Timesheet Approved)

    Note over Fin,DB: 3. Invoice Generation & Billing
    Fin->>Srv: POST /odata/v4/catalog/Projects(ID)/generateInvoice()
    Srv->>DB: Query Approved & Unbilled TimesheetEntries for Project
    Srv->>Srv: Compute Billable Subtotal = SUM(hours * employee.hourlyRate)
    Srv->>Srv: Compute Tax = Subtotal * 0.18, Total = Subtotal + Tax
    Srv->>DB: INSERT Invoices (status='Draft', paymentStatus='Draft')
    Srv->>DB: UPDATE Timesheets SET status = 'Invoiced'
    Srv-->>Fin: HTTP 200 OK (Invoice Created in Draft)
```

---

### Workflow 2: Timesheet Rejection & Resubmission / Edit Cycle

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Employee (UI)
    actor Mgr as Manager (UI)
    participant Srv as CAP CatalogService
    participant DB as SAP HANA DB

    Mgr->>Srv: POST /odata/v4/catalog/Timesheets(ID)/rejectTimesheet(reason="Incorrect Task hours")
    Srv->>DB: UPDATE Timesheets SET status = 'Rejected', rejectionReason = 'Incorrect Task hours'
    Srv-->>Mgr: HTTP 200 OK (Status Updated)

    Emp->>Srv: GET /odata/v4/catalog/Timesheets(ID) (Employee sees Rejected status)
    Note over Emp: Employee edits week dates or entries
    Emp->>Srv: POST /odata/v4/catalog/updateTimesheet(ID, weekStartDate, weekEndDate)
    Srv->>DB: UPDATE Timesheets SET weekStartDate = ..., weekEndDate = ...
    Emp->>Srv: POST /odata/v4/catalog/Timesheets(ID)/submitTimesheet()
    Srv->>DB: UPDATE Timesheets SET status = 'Submitted', rejectionReason = NULL
    Srv-->>Emp: HTTP 200 OK (Resubmitted for Review)
```

---

### Workflow 3: Invoice Issuance, Payment Recording & Revenue Realization

```mermaid
sequenceDiagram
    autonumber
    actor Fin as Finance Officer
    actor Client as External Client
    participant Srv as CAP CatalogService
    participant DB as SAP HANA DB

    Fin->>Srv: POST /odata/v4/catalog/Invoices(ID)/issue()
    Note over Srv: Precondition: status === 'Draft' && paymentStatus === 'Draft'
    Srv->>DB: UPDATE Invoices SET status = 'Sent', paymentStatus = 'Issued'
    Srv-->>Fin: HTTP 200 OK (Invoice Issued to Client)

    Client-->>Fin: Payment Cleared via Wire / Bank Transfer
    Fin->>Srv: POST /odata/v4/catalog/Invoices(ID)/markPaid()
    Note over Srv: Precondition: paymentStatus === 'Issued' or status in ('Sent', 'Issued')
    Srv->>DB: UPDATE Invoices SET status = 'Paid', paymentStatus = 'Paid', paidDate = NOW()
    Srv-->>Fin: HTTP 200 OK (Invoice Marked Paid)
    Note over Fin: Finance KPIs update: Outstanding Balance decrements, Total Paid increments
```

---

## 4. Lifecycle State Machines

### 4.1 Timesheet Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft : Created by Employee
    Draft --> Submitted : submitTimesheet()
    Submitted --> Approved : approveTimesheet() [by Manager]
    Submitted --> Rejected : rejectTimesheet(reason) [by Manager]
    Rejected --> Draft : Re-opened for Editing
    Rejected --> Submitted : Directly Resubmitted via submitTimesheet()
    Approved --> Invoiced : Projects.generateInvoice()
    Invoiced --> [*]
```

### 4.2 Invoice & Payment Dual-Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft_Draft : generateInvoice() [status=Draft, paymentStatus=Draft]
    Draft_Draft --> Sent_Issued : Invoices.issue()
    Sent_Issued --> Paid_Paid : Invoices.markPaid()
    Draft_Draft --> Cancelled : Administrative Cancellation
    Sent_Issued --> Overdue_Issued : Due Date Passed (Aging Job)
    Overdue_Issued --> Paid_Paid : Invoices.markPaid()
    Cancelled --> [*]
    Paid_Paid --> [*]
```

---

## 5. Security Architecture & Production Hardening Roadmap

### 5.1 Current Architecture Analysis
- **Service Layer**: `srv/cat-service.cds` exposes `CatalogService` without restrictive `@requires` or `@restrict` annotations.
- **Authentication**: Local/development mock authentication currently active.
- **HDI Binding**: Secure HANA HDI credentials injected via Cloud Foundry environment variables (`VCAP_SERVICES`) in production and `.env` in local development.

### 5.2 Enterprise Hardening Recommendations

To achieve production compliance on SAP Business Technology Platform (BTP), execute the following configuration steps:

1. **Enable SAP Cloud Identity Services (XSUAA)**:
   Add `xs-security.json` defining standard PSA security scopes:
   - `PSA.Admin`: Full administrative and financial configuration.
   - `PSA.Manager`: Project management, team allocation, budget monitoring, and timesheet approvals.
   - `PSA.Employee`: Personal timesheet entry, task logging, and profile view.
   - `PSA.Finance`: Invoicing, accounts receivable, and payment processing.

2. **Decorate CDS Entities with Restrictions**:
   ```cds
   annotate CatalogService.Timesheets with @(restrict: [
       { grant: ['READ', 'CREATE', 'UPDATE'], to: 'Employee', where: 'employee.email = $user' },
       { grant: ['READ', 'approveTimesheet', 'rejectTimesheet'], to: 'Manager', where: 'employee.managerProfile.ID = $user.managerID' },
       { grant: '*', to: 'Admin' }
   ]);
   ```

3. **MTA Configuration Update**:
   Bind `enterprisepsa-srv` module to an `xsuaa` managed resource in `mta.yaml`.
