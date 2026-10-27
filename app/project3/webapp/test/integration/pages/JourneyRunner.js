sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"project3/test/integration/pages/TimesheetsList.gen",
	"project3/test/integration/pages/TimesheetsObjectPage.gen"
], function (JourneyRunner, TimesheetsListGenerated, TimesheetsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('project3') + '/test/flp.html#app-preview',
        pages: {
			onTheTimesheetsListGenerated: TimesheetsListGenerated,
			onTheTimesheetsObjectPageGenerated: TimesheetsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

