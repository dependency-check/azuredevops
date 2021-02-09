import tl = require('azure-pipelines-task-lib/task');
import fs = require('fs');
import httpClient = require('typed-rest-client/HttpClient');
import unzipper = require('unzipper');

const client = new httpClient.HttpClient('DC_AGENT');
const releaseApi = 'https://api.github.com/repos/jeremylong/DependencyCheck/releases';

// Install prerequisites : https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops#prerequisites
// To test locally Run:
// cd ./Tasks/dependency-check-build-task-v2/
// npm install
// tsc
// node dependency-check-build-task.js

async function run() {
    console.log("Starting Dependency Check...")
    try {
        // Get inputs from build task.
        let projectName: string | undefined = tl.getInput('projectName', true);
        let scanPath: string | undefined = tl.getPathInput('scanPath', true, true);
        let excludePath: string | undefined = tl.getPathInput('excludePath');
        let format: string | undefined = tl.getInput('format', true);
        let failOnCVSS: boolean | undefined = tl.getBoolInput('failOnCVSS');
        let suppressionPath: string | undefined = tl.getPathInput('suppressionPath');
        let reportsDirectory: string | undefined = tl.getPathInput('reportsDirectory');
        let enableExperimental: boolean | undefined = tl.getBoolInput('enableExperimental', true);
        let enableRetired: boolean | undefined = tl.getBoolInput('enableRetired', true);
        let enableVerbose: boolean | undefined = tl.getBoolInput('enableVerbose', true);
        let localInstallPath: string | undefined = tl.getPathInput('localInstallPath');
        let dependencyCheckVersion: string | undefined = tl.getInput('dependencyCheckVersion') || 'latest';
        let dataMirror: string | undefined = tl.getInput('dataMirror');
        let customRepo: string | undefined = tl.getInput('customRepo');
        let additionalArguments: string | undefined = tl.getInput('additionalArguments');

        // Trim the strings
        projectName = projectName?.trim()
        scanPath = scanPath?.trim();
        excludePath = excludePath?.trim();
        suppressionPath = suppressionPath?.trim();
        reportsDirectory = reportsDirectory?.trim();
        additionalArguments = additionalArguments?.trim();
        localInstallPath = localInstallPath?.trim();

        let testDir = tl.getVariable('Common.TestResultsDirectory');

        // Set reports directory (if necessary)
        if (!reportsDirectory) {
            reportsDirectory = `${testDir}\\dependency-check`;
        }
        console.log(`Setting report directory to ${reportsDirectory}`);

        // Create report directory (if necessary)
        if (!tl.exist(reportsDirectory!)) {
            console.log(`Creating report directory at ${reportsDirectory}`);
            tl.mkdirP(reportsDirectory!);
        }

        // Default args
        let args = `--project "${projectName}" --scan "${scanPath}" --out "${reportsDirectory}"`;

        // Exclude switch
        if (excludePath) {
            args += ` --exclude "${excludePath}"`;
        }

        // Format types
        let outputTypes = format?.split(',');
        outputTypes?.forEach(function (outputType) {
            args += ` --format ${outputType}`;
        });

        // Fail on CVSS switch
        if (failOnCVSS) {
            args += ` --failOnCVSS ${failOnCVSS}`;
        }

        // Suppression switch
        if (suppressionPath) {
            args += ` --suppression "${suppressionPath}"`;
        }

        // Set enableExperimental option if requested
        if (enableExperimental) {
            args += ' --enableExperimental';
        }

        // Set enableRetired option if requested
        if (enableRetired) {
            args += ' --enableRetired';
        }

        // Set log switch if requested
        if (enableVerbose) {
            args += ` --log "${reportsDirectory}\log"`;
        }

        // additionalArguments
        if (additionalArguments) {
            args += ` ${additionalArguments}`;
        }

        // Set installation location
        if (!localInstallPath) {
            localInstallPath = 'dependency-check';

            let url;
            if (customRepo) {
                console.log(`Downloading Dependency Check installer from ${customRepo}...`);
                url = customRepo;
            }
            else {
                console.log(`Downloading Dependency Check ${dependencyCheckVersion} installer from GitHub..`);
                url = await getUrl(dependencyCheckVersion);
            }

            await unzip(url);
        }

        console.log(args);
    }
    catch (err) {
        console.log(err.message);
        tl.error(err.message);
        tl.setResult(tl.TaskResult.Failed, 'Unhandled error condition detected.');
    }

    console.log("Ending Dependency Check...");
}

async function getUrl(version) {
    let url = `${releaseApi}/tags/v${version}`;
    if (version == 'latest')
        url = `${releaseApi}/${version}`;

    let response = await client.get(url);
    let releaseInfo = JSON.parse(await response.readBody());
    let asset = releaseInfo['assets'].find(asset => asset['content_type'] == 'application/zip');

    return asset['browser_download_url'];
}

async function unzip(url) {
    let response = await client.get(url);
    await response.message.pipe(unzipper.Extract({ path: './' }));
}

run();