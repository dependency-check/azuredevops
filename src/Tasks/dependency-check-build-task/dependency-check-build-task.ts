import tl = require('azure-pipelines-task-lib/task');
import httpClient = require('typed-rest-client/HttpClient');
import fs = require('fs');
import url = require("url");
import path = require("path");
import DecompressZip = require('decompress-zip');

const client = new httpClient.HttpClient('DC_AGENT');
const releaseApi = 'https://api.github.com/repos/jeremylong/DependencyCheck/releases';

// Install prerequisites : https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops#prerequisites
// To test locally Run:
// cd ./Tasks/dependency-check-build-task/
// npm install
// npm run build
// node dependency-check-build-task.js

async function run() {
    console.log("Starting Dependency Check...")
    try {
        // Get inputs from build task.
        let projectName: string | undefined = tl.getInput('projectName', true);
        let scanPath: string | undefined = tl.getPathInput('scanPath', true);
        let excludePath: string | undefined = tl.getPathInput('excludePath');
        let format: string | undefined = tl.getInput('format', true);
        let failOnCVSS: string | undefined = tl.getInput('failOnCVSS');
        let suppressionPath: string | undefined = tl.getPathInput('suppressionPath');
        let reportsDirectory: string | undefined = tl.getPathInput('reportsDirectory');
        let warnOnCVSSViolation: boolean | undefined = tl.getBoolInput('warnOnCVSSViolation', true);
        let reportFilename: string | undefined = tl.getPathInput('reportFilename');
        let enableExperimental: boolean | undefined = tl.getBoolInput('enableExperimental', true);
        let enableRetired: boolean | undefined = tl.getBoolInput('enableRetired', true);
        let enableVerbose: boolean | undefined = tl.getBoolInput('enableVerbose', true);
        let localInstallPath: string | undefined = tl.getPathInput('localInstallPath');
        let dependencyCheckVersion: string | undefined = tl.getInput('dependencyCheckVersion') || 'latest';
        let dataMirror: string | undefined = tl.getInput('dataMirror');
        let customRepo: string | undefined = tl.getInput('customRepo');
        let additionalArguments: string | undefined = tl.getInput('additionalArguments');
        let hasLocalInstallation = true;

        // Trim the strings
        projectName = projectName?.trim()
        scanPath = scanPath?.trim();
        excludePath = excludePath?.trim();
        suppressionPath = suppressionPath?.trim();
        reportsDirectory = reportsDirectory?.trim();
        reportFilename = reportFilename?.trim();
        additionalArguments = additionalArguments?.trim();
        localInstallPath = localInstallPath?.trim();

        let sourcesDirectory = tl.getVariable('Build.SourcesDirectory');
        let testDirectory = tl.getVariable('Common.TestResultsDirectory');

        // Set reports directory (if necessary)
        if (reportsDirectory == sourcesDirectory)
            reportsDirectory = tl.resolve(testDirectory, 'dependency-check');
        console.log(`Setting report directory to ${reportsDirectory}`);

        // Set logs file
        let logFile = tl.resolve(reportsDirectory, 'log');

        // Create report directory (if necessary)
        if (!tl.exist(reportsDirectory!)) {
            console.log(`Creating report directory at ${reportsDirectory}`);
            tl.mkdirP(reportsDirectory!);
        }

        // Set output folder (and filename if supplied)
        let outField: string = reportsDirectory;
        if (reportFilename && format?.split(',')?.length === 1 && format != "ALL") {
            outField = tl.resolve(reportsDirectory, reportFilename);
        }

        // Default args
        let args = `--project "${projectName}" --out "${outField}"`;

        // Scan paths
        let paths = scanPath?.split(',');
        paths?.forEach(path => {
            args += ` --scan "${path}"`;
        });

        // Exclude switch
        if (excludePath != sourcesDirectory)
            args += ` --exclude "${excludePath}"`;

        // Format types
        let outputTypes = format?.split(',');
        outputTypes?.forEach(outputType => {
            args += ` --format ${outputType}`;
        });

        // Fail on CVSS switch
        if (failOnCVSS)
            args += ` --failOnCVSS ${failOnCVSS}`;

        // Suppression switch
        if (suppressionPath != sourcesDirectory)
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
        if (localInstallPath == sourcesDirectory) {
            hasLocalInstallation = false;
            localInstallPath = tl.resolve('./dependency-check');

            tl.checkPath(localInstallPath, 'Dependency Check installer');

            let zipUrl;
            if (customRepo) {
                console.log(`Downloading Dependency Check installer from ${customRepo}...`);
                zipUrl = customRepo;
            }
            else {
                console.log(`Downloading Dependency Check ${dependencyCheckVersion} installer from GitHub..`);
                zipUrl = await getZipUrl(dependencyCheckVersion);
            }

            cleanLocalInstallPath(localInstallPath);
            await unzipFromUrl(zipUrl, tl.resolve('./'));
        }

        // Get dependency check data dir path
        let dataDirectory = tl.resolve(localInstallPath, 'data');

        // Pull cached data archive
        if (dataMirror && tl.exist(dataDirectory)) {
            console.log('Downloading Dependency Check data cache archive...');
            await unzipFromUrl(dataMirror, dataDirectory);
        }

        // Get dependency check script path (.sh file for Linux and Darwin OS)
        let depCheck = 'dependency-check.sh';
        if (tl.osType().match(/^Windows/)) depCheck = 'dependency-check.bat';
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
        await tl.tool(depCheckPath).arg('--version').exec();

        if(!hasLocalInstallation) {
            // Remove lock files from potential previous canceled run if no local/centralized installation of tool is used.
            // We need this because due to a bug the dependency check tool is currently leaving .lock files around if you cancel at the wrong moment.
            // Since a per-agent installation shouldn't be able to run two scans parallel, we can savely remove all lock files still lying around.
            console.log('Searching for left over lock files...');
            let lockFiles = tl.findMatch(localInstallPath, '*.lock', null, { matchBase: true });
            if(lockFiles.length > 0) {
                console.log('found ' + lockFiles.length + ' left over lock files, removing them now...');
                lockFiles.forEach(lockfile => {
                    let fullLockFilePath = tl.resolve(lockfile);
                    try {
                        if(tl.exist(fullLockFilePath)) {
                            console.log('removing lock file "' + fullLockFilePath + '"...');
                            tl.rmRF(fullLockFilePath);
                        }
                        else {
                            console.log('found lock file "' + fullLockFilePath + '" doesn\'t exist, that was unexpected');
                        }
                    }
                    catch (err) {
                        console.log('could not delete lock file "' + fullLockFilePath + '"!');
                        console.error(err);
                    }
                });
            }
            else {
                console.log('found no left over lock files, continuing...');
            }
        }

        // Run the scan
        let exitCode = await tl.tool(depCheckPath).line(args).exec({ failOnStdErr: false, ignoreReturnCode: true });
        console.log(`Dependency Check completed with exit code ${exitCode}.`);
        console.log('Dependency Check reports:');
        console.log(tl.findMatch(reportsDirectory, '**/*.*'));

        // Process based on exit code
        let failed = exitCode != 0;
        let isViolation = exitCode == 1;

        // Process scan artifacts is required
        let processArtifacts = !failed || isViolation;
        if (processArtifacts) {
            logDebug('Attachments:');
            let reports = tl.findMatch(reportsDirectory, '**/*.*');
            reports.forEach(filePath => {
                let fileName = path.basename(filePath).replace('.', '%2E');
                let fileExt = path.extname(filePath);
                logDebug(`Attachment name: ${fileName}`);
                logDebug(`Attachment path: ${filePath}`);
                logDebug(`Attachment type: ${fileExt}`); 
                console.log(`##vso[task.addattachment type=dependencycheck-artifact;name=${fileName};]${filePath}`);
                console.log(`##vso[artifact.upload containerfolder=dependency-check;artifactname=Dependency Check;]${filePath}`);
            })

            // Upload logs
            if (enableVerbose)
                console.log(`##vso[build.uploadlog]${logFile}`);
        }

        let message = "Dependency Check succeeded"
        let result = tl.TaskResult.Succeeded
        if (failed) {
            if(isViolation) {
                message = "CVSS threshold violation.";

                if(warnOnCVSSViolation) {
                    result = tl.TaskResult.SucceededWithIssues
                }
                else {
                    result = tl.TaskResult.Failed
                }
            }
            else {
                message = "Dependency Check exited with an error code (exit code: " + exitCode + ")."
                result = tl.TaskResult.Failed
            }
        }

        let consoleMessage = 'Dependency Check ';
        switch(result) {
            case tl.TaskResult.Succeeded:
                consoleMessage += 'succeeded'
                break;
            case tl.TaskResult.SucceededWithIssues:
                consoleMessage += 'succeeded with issues'
                break;
            case tl.TaskResult.Failed:
                consoleMessage += 'failed'
                break;
        }
        consoleMessage += ' with message "' + message + '"'
        console.log(consoleMessage);

        tl.setResult(result, message);
    }
    catch (err) {
        console.log(err.message);
        tl.error(err.message);
        tl.setResult(tl.TaskResult.Failed, 'Unhandled error condition detected.');
    }

    console.log("Ending Dependency Check...");
}

function logDebug(message: string) {
    if(message !== null) {
        let varSystemDebug = tl.getVariable('system.debug');

        if(typeof varSystemDebug === 'string') {
            if(varSystemDebug.toLowerCase() == 'true') {
                console.log('##[debug]' + message)
            }
        }    
    }
}

function cleanLocalInstallPath(localInstallPath: string) {
    let files = tl.findMatch(localInstallPath, ['**', '!data', '!data/**']);
    files.forEach(file => tl.rmRF(file));
}

async function getZipUrl(version: string): Promise<void> {
    let url = `${releaseApi}/tags/v${version}`;
    if (version == 'latest') url = `${releaseApi}/${version}`;

    let response = await client.get(url);
    let releaseInfo = JSON.parse(await response.readBody());
    let asset = releaseInfo['assets'].find(asset => asset['content_type'] == 'application/zip');

    return asset['browser_download_url'];
}

async function unzipFromUrl(zipUrl: string, unzipLocation: string): Promise<void> {
    let fileName = path.basename(url.parse(zipUrl).pathname);
    let zipLocation = tl.resolve(fileName)
    let tmpError = null;
    let response = null;
    let downloadErrorRetries = 5;
    
    do {
        tmpError = null;
        try {
            await console.log('Downloading ZIP from "' + zipUrl + '"...');
            response = await client.get(zipUrl);
            await logDebug('done downloading');
        }
        catch(error) {
            tmpError = error;
            downloadErrorRetries--;
            await console.error('Error trying to download ZIP (' + (downloadErrorRetries+1) + ' tries left)');
            await console.error(error);
        }
    }
    while(tmpError !== null && downloadErrorRetries >= 0);
    
    if(tmpError !== null) {
        throw tmpError;
    }

    await logDebug('Download was successful, saving downloaded ZIP file...');

    await new Promise<void>(function (resolve, reject) {
        let writer = fs.createWriteStream(zipLocation);
        writer.on('error', err => reject(err));
        writer.on('finish', log => resolve());
        response.message.pipe(writer);
    });

    await logDebug('Downloaded ZIP file has been saved, unzipping now...');

    await unzipFromFile(zipLocation, unzipLocation);

    await logDebug('Unzipping complete, removing ZIP file now...');

    tl.rmRF(zipLocation);

    await logDebug('ZIP file has been removed');
}

async function unzipFromFile(zipLocation: string, unzipLocation: string): Promise<void> {
    await new Promise<void>(function (resolve, reject) {
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
}

run();
