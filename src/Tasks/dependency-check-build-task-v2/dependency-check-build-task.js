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
const fs = require("fs");
const url = require("url");
const path = require("path");
const DecompressZip = require("decompress-zip");
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
            let failOnCVSS = tl.getInput('failOnCVSS');
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
            let testDirectory = tl.getVariable('Common.TestResultsDirectory');
            // Set reports directory (if necessary)
            if (!reportsDirectory)
                reportsDirectory = tl.resolve(testDirectory, 'dependency-check');
            console.log(`Setting report directory to ${reportsDirectory}`);
            // Set logs file
            let logFile = tl.resolve(reportsDirectory, 'log');
            // Create report directory (if necessary)
            if (!tl.exist(reportsDirectory)) {
                console.log(`Creating report directory at ${reportsDirectory}`);
                tl.mkdirP(reportsDirectory);
            }
            // Default args
            let args = `--project "${projectName}" --scan "${scanPath}" --out "${reportsDirectory}"`;
            // Exclude switch
            if (excludePath)
                args += ` --exclude "${excludePath}"`;
            // Format types
            let outputTypes = format === null || format === void 0 ? void 0 : format.split(',');
            outputTypes === null || outputTypes === void 0 ? void 0 : outputTypes.forEach(outputType => {
                args += ` --format ${outputType}`;
            });
            // Fail on CVSS switch
            if (failOnCVSS)
                args += ` --failOnCVSS ${failOnCVSS}`;
            // Suppression switch
            if (suppressionPath)
                args += ` --suppression "${suppressionPath}"`;
            // Set enableExperimental option if requested
            if (enableExperimental)
                args += ' --enableExperimental';
            // Set enableRetired option if requested
            if (enableRetired)
                args += ' --enableRetired';
            // Set log switch if requested
            if (enableVerbose)
                args += ` --log "${logFile}"`;
            // Set additionalArguments
            if (additionalArguments)
                args += ` ${additionalArguments}`;
            // Set installation location
            if (!localInstallPath) {
                localInstallPath = tl.resolve('./dependency-check');
                tl.checkPath(localInstallPath, 'Dependency Check installer');
                let zipUrl;
                if (customRepo) {
                    console.log(`Downloading Dependency Check installer from ${customRepo}...`);
                    zipUrl = customRepo;
                }
                else {
                    console.log(`Downloading Dependency Check ${dependencyCheckVersion} installer from GitHub..`);
                    zipUrl = yield getZipUrl(dependencyCheckVersion);
                }
                cleanLocalInstallPath(localInstallPath);
                yield unzipFromUrl(zipUrl, tl.resolve('./'));
            }
            // Get dependency check data dir path
            let dataDirectory = tl.resolve(localInstallPath, 'data');
            // Pull cached data archive
            if (dataMirror && tl.exist(dataDirectory)) {
                console.log('Downloading Dependency Check data cache archive...');
                yield unzipFromUrl(dataMirror, dataDirectory);
            }
            // Get dependency check script path
            let depCheck = 'dependency-check.bat';
            if (tl.osType().match(/^Linux/))
                depCheck = 'dependency-check.sh';
            let depCheckPath = tl.resolve(localInstallPath, 'bin', depCheck);
            console.log(`Dependency Check script set to ${depCheckPath}`);
            tl.checkPath(depCheckPath, 'Dependency Check script');
            // Console output for the log file
            console.log('Invoking Dependency Check...');
            console.log(`Path: ${depCheckPath}`);
            console.log(`Arguments: ${args}`);
            // Set Java args
            tl.setVariable('JAVA_OPTS', '-Xss8192k');
            // Version smoke test
            yield tl.tool(depCheckPath).arg('--version').exec();
            // Run the scan
            let exitCode = yield tl.tool(depCheckPath).line(args).exec({ failOnStdErr: false, ignoreReturnCode: false });
            console.log(`Dependency Check completed with exit code ${exitCode}.`);
            console.log('Dependency Check reports:');
            console.log(tl.find(reportsDirectory));
            // Process based on exit code
            let failed = exitCode != 0;
            let isViolation = exitCode == 1;
            // Process scan artifacts is required
            let processArtifacts = !failed || isViolation;
            if (processArtifacts) {
                console.debug("Attachments:");
                let reports = tl.findMatch(reportsDirectory, '**/*.*');
                reports.forEach(filePath => {
                    let fileName = path.basename(filePath).replace('.', '%2E');
                    let fileExt = path.extname(filePath);
                    console.debug(`Attachment name: ${fileName}`);
                    console.debug(`Attachment path: ${filePath}`);
                    console.debug(`Attachment type: ${fileExt}`);
                    console.log(`##vso[task.addattachment type=dependencycheck-artifact;name=${fileName};]${filePath}`);
                    console.log(`##vso[artifact.upload containerfolder=dependency-check;artifactname=Dependency Check;]${filePath}`);
                });
                // Upload logs
                if (enableVerbose)
                    console.log(`##vso[build.uploadlog]${logFile}`);
            }
            if (failed) {
                let message = "Dependency Check exited with an error code.";
                if (isViolation)
                    message = "CVSS threshold violation.";
                tl.error(message);
                tl.setResult(tl.TaskResult.Failed, message);
            }
        }
        catch (err) {
            console.log(err.message);
            tl.error(err.message);
            tl.setResult(tl.TaskResult.Failed, 'Unhandled error condition detected.');
        }
        console.log("Ending Dependency Check...");
    });
}
function cleanLocalInstallPath(localInstallPath) {
    let files = tl.findMatch(localInstallPath, ['**', '!data', '!data/**']);
    files.forEach(file => tl.rmRF(file));
}
function getZipUrl(version) {
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
function unzipFromUrl(zipUrl, unzipLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        let fileName = path.basename(url.parse(zipUrl).pathname);
        let zipLocation = tl.resolve(fileName);
        let response = yield client.get(zipUrl);
        yield new Promise(function (resolve, reject) {
            let writer = fs.createWriteStream(zipLocation);
            writer.on('error', err => reject(err));
            writer.on('finish', log => resolve());
            response.message.pipe(writer);
        });
        yield unzipFromFile(zipLocation, unzipLocation);
        tl.rmRF(zipLocation);
    });
}
function unzipFromFile(zipLocation, unzipLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise(function (resolve, reject) {
            tl.debug('Extracting ' + zipLocation + ' to ' + unzipLocation);
            var unzipper = new DecompressZip(zipLocation);
            unzipper.on('error', err => reject(err));
            unzipper.on('extract', log => {
                tl.debug('Extracted ' + zipLocation + ' to ' + unzipLocation + ' successfully');
                return resolve();
            });
            unzipper.extract({
                path: unzipLocation
            });
        });
    });
}
run();