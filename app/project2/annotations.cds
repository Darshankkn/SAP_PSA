using CatalogService as service from '../../srv/cat-service';

annotate service.Projects with @(

    UI.HeaderInfo : {
        TypeName       : 'Project',
        TypeNamePlural : 'Projects',

        Title : {
            $Type : 'UI.DataField',
            Value : projectName
        },

        Description : {
            $Type : 'UI.DataField',
            Value : projectCode
        }
    },

    UI.SelectionFields : [
        projectCode,
        projectName,
        status,
        billingType
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : projectCode,
            Label : 'Project Code'
        },
        {
            $Type : 'UI.DataField',
            Value : projectName,
            Label : 'Project Name'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status'
        },
        {
            $Type : 'UI.DataField',
            Value : billingType,
            Label : 'Billing Type'
        },
        {
            $Type : 'UI.DataField',
            Value : startDate,
            Label : 'Start Date'
        },
        {
            $Type : 'UI.DataField',
            Value : endDate,
            Label : 'End Date'
        },
        {
            $Type : 'UI.DataField',
            Value : plannedHours,
            Label : 'Planned Hours'
        },
        {
            $Type : 'UI.DataField',
            Value : consumedHours,
            Label : 'Consumed Hours'
        }
    ],

    UI.Identification : [
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.recalculateBudget',
            Label  : 'Recalculate Budget'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.generateInvoice',
            Label  : 'Generate Invoice'
        }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ProjectInformationFacet',
            Label  : 'Project Information',
            Target : '@UI.FieldGroup#ProjectInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'BudgetInformationFacet',
            Label  : 'Budget Information',
            Target : 'budget/@UI.FieldGroup#BudgetInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'MilestonesFacet',
            Label  : 'Milestones',
            Target : 'milestones/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'InvoicesFacet',
            Label  : 'Invoices',
            Target : 'invoices/@UI.LineItem'
        }
    ],

    UI.FieldGroup #ProjectInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : projectCode,
                Label : 'Project Code'
            },
            {
                $Type : 'UI.DataField',
                Value : projectName,
                Label : 'Project Name'
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Project Status'
            },
            {
                $Type : 'UI.DataField',
                Value : billingType,
                Label : 'Billing Type'
            },
            {
                $Type : 'UI.DataField',
                Value : startDate,
                Label : 'Start Date'
            },
            {
                $Type : 'UI.DataField',
                Value : endDate,
                Label : 'End Date'
            },
            {
                $Type : 'UI.DataField',
                Value : plannedHours,
                Label : 'Planned Hours'
            },
            {
                $Type : 'UI.DataField',
                Value : consumedHours,
                Label : 'Consumed Hours'
            }
        ]
    }
);

annotate service.Budgets with @(

    UI.HeaderInfo : {
        TypeName       : 'Budget',
        TypeNamePlural : 'Budgets',

        Title : {
            $Type : 'UI.DataField',
            Value : budgetAmount
        },

        Description : {
            $Type : 'UI.DataField',
            Value : budgetStatus
        }
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : budgetAmount,
            Label : 'Budget Amount'
        },
        {
            $Type : 'UI.DataField',
            Value : consumedAmount,
            Label : 'Consumed Amount'
        },
        {
            $Type : 'UI.DataField',
            Value : remainingAmount,
            Label : 'Remaining Amount'
        },
        {
            $Type : 'UI.DataField',
            Value : billingRateHr,
            Label : 'Billing Rate / Hour'
        },
        {
            $Type : 'UI.DataField',
            Value : currencyCode,
            Label : 'Currency'
        },
        {
            $Type : 'UI.DataField',
            Value : budgetStatus,
            Label : 'Budget Status'
        }
    ],

    UI.FieldGroup #BudgetInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : budgetAmount,
                Label : 'Budget Amount'
            },
            {
                $Type : 'UI.DataField',
                Value : consumedAmount,
                Label : 'Consumed Amount'
            },
            {
                $Type : 'UI.DataField',
                Value : remainingAmount,
                Label : 'Remaining Amount'
            },
            {
                $Type : 'UI.DataField',
                Value : billingRateHr,
                Label : 'Billing Rate / Hour'
            },
            {
                $Type : 'UI.DataField',
                Value : currencyCode,
                Label : 'Currency'
            },
            {
                $Type : 'UI.DataField',
                Value : budgetStatus,
                Label : 'Budget Status'
            }
        ]
    }
);

annotate service.Milestones with @(

    UI.HeaderInfo : {
        TypeName       : 'Milestone',
        TypeNamePlural : 'Milestones',

        Title : {
            $Type : 'UI.DataField',
            Value : milestoneName
        },

        Description : {
            $Type : 'UI.DataField',
            Value : status
        }
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : milestoneName,
            Label : 'Milestone Name'
        },
        {
            $Type : 'UI.DataField',
            Value : startDate,
            Label : 'Start Date'
        },
        {
            $Type : 'UI.DataField',
            Value : endDate,
            Label : 'End Date'
        },
        {
            $Type : 'UI.DataField',
            Value : completionPercent,
            Label : 'Completion %'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status'
        }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'MilestoneInformationFacet',
            Label  : 'Milestone Information',
            Target : '@UI.FieldGroup#MilestoneInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'TasksFacet',
            Label  : 'Tasks',
            Target : 'tasks/@UI.LineItem'
        }
    ],

    UI.FieldGroup #MilestoneInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : milestoneName,
                Label : 'Milestone Name'
            },
            {
                $Type : 'UI.DataField',
                Value : startDate,
                Label : 'Start Date'
            },
            {
                $Type : 'UI.DataField',
                Value : endDate,
                Label : 'End Date'
            },
            {
                $Type : 'UI.DataField',
                Value : completionPercent,
                Label : 'Completion %'
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Status'
            }
        ]
    }
);

annotate service.Tasks with @(

    UI.HeaderInfo : {
        TypeName       : 'Task',
        TypeNamePlural : 'Tasks',

        Title : {
            $Type : 'UI.DataField',
            Value : taskName
        },

        Description : {
            $Type : 'UI.DataField',
            Value : status
        }
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : taskName,
            Label : 'Task Name'
        },
        {
            $Type : 'UI.DataField',
            Value : startDate,
            Label : 'Start Date'
        },
        {
            $Type : 'UI.DataField',
            Value : endDate,
            Label : 'End Date'
        },
        {
            $Type : 'UI.DataField',
            Value : estimatedHours,
            Label : 'Estimated Hours'
        },
        {
            $Type : 'UI.DataField',
            Value : actualHours,
            Label : 'Actual Hours'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status'
        }
    ]
);

// annotate service.Invoices with @(

//     UI.LineItem : [
//         {
//             $Type : 'UI.DataField',
//             Value : invoiceNumber,
//             Label : 'Invoice Number'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : invoiceDate,
//             Label : 'Invoice Date'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : dueDate,
//             Label : 'Due Date'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : billableHours,
//             Label : 'Billable Hours'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : totalAmount,
//             Label : 'Total Amount'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : currencyCode,
//             Label : 'Currency'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : paymentStatus,
//             Label : 'Payment Status'
//         },
//         {
//             $Type : 'UI.DataField',
//             Value : status,
//             Label : 'Invoice Status'
//         }
//     ]
// );