using CatalogService as service from '../../srv/cat-service';

annotate service.Timesheets with @(

    UI.HeaderInfo : {
        TypeName       : 'Timesheet',
        TypeNamePlural : 'Timesheets',

        Title : {
            $Type : 'UI.DataField',
            Value : status
        },

        Description : {
            $Type : 'UI.DataField',
            Value : weekStartDate
        }
    },

    UI.SelectionFields : [
        status,
        weekStartDate,
        weekEndDate
    ],

    UI.LineItem : [
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
            Label : 'Status'
        },
        {
            $Type : 'UI.DataField',
            Value : submittedDate,
            Label : 'Submitted Date'
        },
        {
            $Type : 'UI.DataField',
            Value : approvedDate,
            Label : 'Approved Date'
        }
    ],

    UI.Identification : [
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.submitTimesheet',
            Label  : 'Submit Timesheet'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.approveTimesheet',
            Label  : 'Approve Timesheet'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'CatalogService.rejectTimesheet',
            Label  : 'Reject Timesheet'
        }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'TimesheetInformationFacet',
            Label  : 'Timesheet Information',
            Target : '@UI.FieldGroup#TimesheetInformation'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'TimesheetEntriesFacet',
            Label  : 'Timesheet Entries',
            Target : 'entries/@UI.LineItem'
        }
    ],

    UI.FieldGroup #TimesheetInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : weekStartDate,
                Label : 'Week Start Date'
            },
            {
                $Type : 'UI.DataField',
                Value : weekEndDate,
                Label : 'Week End Date'
            },
            {
                $Type : 'UI.DataField',
                Value : totalBillableHours,
                Label : 'Total Billable Hours'
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Timesheet Status'
            },
            {
                $Type : 'UI.DataField',
                Value : submittedDate,
                Label : 'Submitted Date'
            },
            {
                $Type : 'UI.DataField',
                Value : approvedDate,
                Label : 'Approved Date'
            },
            {
                $Type : 'UI.DataField',
                Value : rejectionReason,
                Label : 'Rejection Reason'
            }
        ]
    }
);

annotate service.TimesheetEntries with @(

    UI.HeaderInfo : {
        TypeName       : 'Timesheet Entry',
        TypeNamePlural : 'Timesheet Entries',

        Title : {
            $Type : 'UI.DataField',
            Value : workDate
        },

        Description : {
            $Type : 'UI.DataField',
            Value : hours
        }
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : workDate,
            Label : 'Work Date'
        },
        {
            $Type : 'UI.DataField',
            Value : hours,
            Label : 'Hours'
        },
        {
            $Type : 'UI.DataField',
            Value : billable,
            Label : 'Billable'
        }
    ],

    UI.FieldGroup #EntryInformation : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : workDate,
                Label : 'Work Date'
            },
            {
                $Type : 'UI.DataField',
                Value : hours,
                Label : 'Hours'
            },
            {
                $Type : 'UI.DataField',
                Value : billable,
                Label : 'Billable'
            }
        ]
    }
);