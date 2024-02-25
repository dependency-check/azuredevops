import fs = require('fs-extra')
import assert = require('assert');
import path = require('path');
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as Mocha from 'mocha';

describe('DependencyCheck Suite', function () {
    this.timeout(parseInt(process.env.TASK_TEST_TIMEOUT) || 20000);

    before(() => {
        const dataPath = path.join(__dirname, "data");
        const dcPath = path.join(dataPath, "dependency-check");
        const logPath = path.join(dcPath, "log");
        fs.removeSync(dataPath);
        fs.mkdirSync(dataPath);
        fs.mkdirSync(dcPath);
        fs.mkdirSync(logPath);

        process.env['PRODUCT_VERSION'] = '0.1.0';
        process.env['BUILD_BINARIESDIRECTORY'] = __dirname;
        process.env['VSTS_PUBLIC_VARIABLES'] = '["Product.Version","Build.BinariesDirectory"]';
        process.env['AGENT_JOBSTATUS'] = "Succeeded";
        process.env['AGENT_NAME'] = "MyAgent";
        process.env['BUILD_BUILDID'] = "5";
        process.env['BUILD_BUILDNUMBER'] = "20210108.1";
        process.env['BUILD_REASON'] = "Scheduled";
        process.env['BUILD_REPOSITORY_NAME'] = "MyRepo";
        process.env['BUILD_SOURCEBRANCHNAME'] = "master";
        process.env['BUILD_SOURCEVERSION'] = "122a24f";
        process.env['BUILD_SOURCESDIRECTORY'] = __dirname;
        process.env['BUILDCONFIGURATION'] = "Debug";
        process.env['BUILDPLATFORM'] = "Any CPU";
        process.env['SYSTEM_ACCESSTOKEN'] = "";
        process.env['SYSTEM_DEFINITIONNAME'] = "MyDefinitionName";
        process.env['SYSTEM_TEAMFOUNDATIONSERVERURI'] = "https://myurl.de/mycollection/";
        process.env['SYSTEM_TEAMPROJECT'] = "PSItraffic";
        process.env['COMMON_TESTRESULTSDIRECTORY'] = "data";
    });

    after(() => {
    });

    it('Basic execution', (done: Mocha.Done) => {
        let tp: string = path.join(__dirname, 'L0BasicExecution.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert(tr.invokedToolCount === 0, 'should not run anything');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });
});