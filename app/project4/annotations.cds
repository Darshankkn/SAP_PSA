using CatalogService as service from '../../srv/cat-service';

annotate service.Invoices with @(

    UI.HeaderInfo : {
        TypeName       : 'Invoice',
        TypeNamePlural : 'Invoices',

        Title : {
            $Type : 'UI.DataField',
            Value : invoiceNumber
        },

        Description : {
            $Type : 'UI.DataField',
            Value : paymentStatus
        }
    },

    UI.SelectionFields : [
        invoiceNumber,
        paymentStatus,
        status,
        invoiceDate,
        dueDate
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : invoiceNumber,
            Label : 'Invoice Number'
        },
        {
            $Type : 'UI.DataField',
            Value : invoiceDate,
            Label : 'Invoice Date'
        },
        {
            $Type : 'UI.DataField',
            Value : dueDate,
            Label : 'Due Date'
        },
        {
            $Type : 'UI.DataField',
            Value : billableHours,
            Label : 'Billable Hours'
        },
        {
            $Type : 'UI.DataField',
            Value : totalAmount,
            Label : 'Total Amount'
        },
        {
            $Type : 'UI.DataField',
            Value : taxAmount,
            Label : 'Tax Amount'
        },
        {
            $Type : 'UI.DataField',
            Value : currencyCode,
            Label : 'Currency'
        },
        {
            $Type : 'UI.DataField',
            Value : paymentStatus,
            Label : 'Payment Status'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Invoice Status'
        }
    ],

    UI.Identification : [
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.issue',
            Label  : 'Issue Invoice'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.markPaid',
            Label  : 'Mark Invoice Paid'
        }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'InvoiceInformationFacet',
            Label  : 'Invoice Information',
            Target : '@UI.FieldGroup#InvoiceInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PaymentInformationFacet',
            Label  : 'Payment Information',
            Target : '@UI.FieldGroup#PaymentInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'InvoiceTimesheetsFacet',
            Label  : 'Invoiced Timesheets',
            Target : 'timesheets/@UI.LineItem'
        }
    ],

    UI.FieldGroup #InvoiceInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : invoiceNumber,
                Label : 'Invoice Number'
            },
            {
                $Type : 'UI.DataField',
                Value : invoiceDate,
                Label : 'Invoice Date'
            },
            {
                $Type : 'UI.DataField',
                Value : dueDate,
                Label : 'Due Date'
            },
            {
                $Type : 'UI.DataField',
                Value : billableHours,
                Label : 'Billable Hours'
            },
            {
                $Type : 'UI.DataField',
                Value : totalAmount,
                Label : 'Total Amount'
            },
            {
                $Type : 'UI.DataField',
                Value : taxAmount,
                Label : 'Tax Amount'
            },
            {
                $Type : 'UI.DataField',
                Value : currencyCode,
                Label : 'Currency'
            }
        ]
    },

    UI.FieldGroup #PaymentInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : paymentStatus,
                Label : 'Payment Status'
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Invoice Status'
            }
        ]
    }
);

annotate service.Timesheets with @(

    UI.LineItem #InvoiceTimesheets : [
        {
            $Type : 'UI.DataField',
            Value : weekStartDate,
            Label : 'Week Start'
        },
        {
            $Type : 'UI.DataField',
            Value : weekEndDate,
            Label : 'Week End'
        },
        {
            $Type : 'UI.DataField',
            Value : totalBillableHours,
            Label : 'Billable Hours'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Timesheet Status'
        },
        {
            $Type : 'UI.DataField',
            Value : approvedDate,
            Label : 'Approved Date'
        }
    ]
);