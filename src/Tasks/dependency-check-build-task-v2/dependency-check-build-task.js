"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const httpClient = require("typed-rest-client/HttpClient");
const unzipper = require("unzipper");
const client = new httpClient.HttpClient('DC_AGENT');
const releaseApi = 'https://api.github.com/repos/jeremylong/DependencyCheck/releases';
// Install prerequisites : https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops#prerequisites
// To test locally Run:
// cd ./Tasks/dependency-check-build-task-v2/
// npm install
// tsc
// node dependency-check-build-task.js
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting Dependency Check...");
        try {
            // Get inputs from build task.
            let projectName = tl.getInput('projectName', true);
            let scanPath = tl.getPathInput('scanPath', true, true);
            let excludePath = tl.getPathInput('excludePath');
            let format = tl.getInput('format', true);
            let failOnCVSS = tl.getBoolInput('failOnCVSS');
            let suppressionPath = tl.getPathInput('suppressionPath');
            let reportsDirectory = tl.getPathInput('reportsDirectory');
            let enableExperimental = tl.getBoolInput('enableExperimental', true);
            let enableRetired = tl.getBoolInput('enableRetired', true);
            let enableVerbose = tl.getBoolInput('enableVerbose', true);
            let localInstallPath = tl.getPathInput('localInstallPath');
            let dependencyCheckVersion = tl.getInput('dependencyCheckVersion') || 'latest';
            let dataMirror = tl.getInput('dataMirror');
            let customRepo = tl.getInput('customRepo');
            let additionalArguments = tl.getInput('additionalArguments');
            // Trim the strings
            projectName = projectName === null || projectName === void 0 ? void 0 : projectName.trim();
            scanPath = scanPath === null || scanPath === void 0 ? void 0 : scanPath.trim();
            excludePath = excludePath === null || excludePath === void 0 ? void 0 : excludePath.trim();
            suppressionPath = suppressionPath === null || suppressionPath === void 0 ? void 0 : suppressionPath.trim();
            reportsDirectory = reportsDirectory === null || reportsDirectory === void 0 ? void 0 : reportsDirectory.trim();
            additionalArguments = additionalArguments === null || additionalArguments === void 0 ? void 0 : additionalArguments.trim();
            localInstallPath = localInstallPath === null || localInstallPath === void 0 ? void 0 : localInstallPath.trim();
            let testDir = tl.getVariable('Common.TestResultsDirectory');
            // Set reports directory (if necessary)
            if (!reportsDirectory) {
                reportsDirectory = `${testDir}\\dependency-check`;
            }
            console.log(`Setting report directory to ${reportsDirectory}`);
            // Create report directory (if necessary)
            if (!tl.exist(reportsDirectory)) {
                console.log(`Creating report directory at ${reportsDirectory}`);
                tl.mkdirP(reportsDirectory);
            }
            // Default args
            let args = `--project "${projectName}" --scan "${scanPath}" --out "${reportsDirectory}"`;
            // Exclude switch
            if (excludePath) {
                args += ` --exclude "${excludePath}"`;
            }
            // Format types
            let outputTypes = format === null || format === void 0 ? void 0 : format.split(',');
            outputTypes === null || outputTypes === void 0 ? void 0 : outputTypes.forEach(function (outputType) {
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
                    url = yield getUrl(dependencyCheckVersion);
                }
                yield unzip(url);
            }
            // Get dependency check data dir path
            let dataDirectory = `${localInstallPath}/data`;
            // Pull cached data archive
            if (dataMirror && tl.exist(dataDirectory)) {
                console.log('Downloading Dependency Check data cache archive...');
                unzip(dataMirror, dataDirectory);
            }
            // Get dependency check script path
            let depCheck = 'dependency-check.bat';
            if (tl.osType().match(/^Linux/))
                depCheck = 'dependency-check.sh';
            let depCheckPath = `${localInstallPath}/bin/${depCheck}`;
            console.log(`Dependency Check installer set to ${depCheckPath}`);
            tl.checkPath(depCheckPath, 'Dependency Check installer');
            console.log('Invoking Dependency Check...');
            console.log(`Path: ${depCheckPath}`);
            console.log(`Arguments: ${args}`);
        }
        catch (err) {
            console.log(err.message);
            tl.error(err.message);
            tl.setResult(tl.TaskResult.Failed, 'Unhandled error condition detected.');
        }
        console.log("Ending Dependency Check...");
    });
}
function getUrl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = `${releaseApi}/tags/v${version}`;
        if (version == 'latest')
            url = `${releaseApi}/${version}`;
        let response = yield client.get(url);
        let releaseInfo = JSON.parse(yield response.readBody());
        let asset = releaseInfo['assets'].find(asset => asset['content_type'] == 'application/zip');
        return asset['browser_download_url'];
    });
}
function unzip(url, directory) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield client.get(url);
        yield response.message.pipe(unzipper.Extract({ path: directory !== null && directory !== void 0 ? directory : './' }));
    });
}
run();
