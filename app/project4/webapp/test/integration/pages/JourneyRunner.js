sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"project4/test/integration/pages/InvoicesList.gen",
	"project4/test/integration/pages/InvoicesObjectPage.gen"
], function (JourneyRunner, InvoicesListGenerated, InvoicesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('project4') + '/test/flp.html#app-preview',
        pages: {
			onTheInvoicesListGenerated: InvoicesListGenerated,
			onTheInvoicesObjectPageGenerated: InvoicesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

