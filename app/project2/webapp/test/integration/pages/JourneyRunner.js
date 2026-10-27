sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"enterprisepsa/project2/test/integration/pages/ProjectsList.gen",
	"enterprisepsa/project2/test/integration/pages/ProjectsObjectPage.gen"
], function (JourneyRunner, ProjectsListGenerated, ProjectsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('enterprisepsa/project2') + '/test/flp.html#app-preview',
        pages: {
			onTheProjectsListGenerated: ProjectsListGenerated,
			onTheProjectsObjectPageGenerated: ProjectsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

