import tl = require('azure-pipelines-task-lib/task');
import httpClient = require('typed-rest-client/HttpClient');
import fs = require('fs');
import path = require('path');
import decompress from 'decompress';
import { IHttpClientResponse } from 'typed-rest-client/Interfaces';

const client = new httpClient.HttpClient('DC_AGENT');
const releaseApi = 'https://api.github.com/repos/jeremylong/DependencyCheck/releases';

async function run() {
    console.log("Starting Dependency Check...")
    let enableVerbose: boolean = true;
    let logFile: string = "";
    try {
        // Get inputs from build task.
        enableVerbose = tl.getBoolInput('enableVerbose', true);

        let projectName: string = tl.getInput('projectName', true);
        let scanPath: string = tl.getPathInput('scanPath', true);
        let excludePath: string | undefined = tl.getPathInput('excludePath');
        let format: string = tl.getInput('format', true);
        let suppressionPath: string | undefined = tl.getPathInput('suppressionPath');
        let reportsDirectory: string | undefined = tl.getPathInput('reportsDirectory');
        let reportFilename: string | undefined = tl.getPathInput('reportFilename');
        let localInstallPath: string | undefined = tl.getPathInput('localInstallPath');
        let additionalArguments: string | undefined = tl.getInput('additionalArguments');
        let nvdApiKey: string | undefined = tl.getInput('nvdApiKey');
        let hasLocalInstallation = true;

        const enableExperimental: boolean = tl.getBoolInput('enableExperimental', true);
        const enableRetired: boolean = tl.getBoolInput('enableRetired', true);
        const uploadReports: boolean = tl.getBoolInput('uploadReports', true);
        const uploadSARIFReport: boolean = tl.getBoolInput('uploadSARIFReport', false);
        const warnOnCVSSViolation: boolean = tl.getBoolInput('warnOnCVSSViolation', true);
        const failOnCVSS: string | undefined = tl.getInput('failOnCVSS');
        const dependencyCheckVersion: string | undefined = tl.getInput('dependencyCheckVersion') || 'latest';
        const dataMirror: string | undefined = tl.getInput('dataMirror');
        const customRepo: string | undefined = tl.getInput('customRepo');

        // Trim the strings
        projectName = projectName.trim();
        scanPath = scanPath.trim();
        format = format.trim();

        if (excludePath !== undefined) excludePath = excludePath.trim();
        if (suppressionPath !== undefined) suppressionPath = suppressionPath.trim();
        if (reportsDirectory !== undefined) reportsDirectory = reportsDirectory.trim();
        if (reportFilename !== undefined) reportFilename = reportFilename.trim();
        if (additionalArguments !== undefined) additionalArguments = additionalArguments.trim();
        if (localInstallPath !== undefined) localInstallPath = localInstallPath.trim();
        if (nvdApiKey !== undefined) nvdApiKey = nvdApiKey.trim();

        const sourcesDirectory = tl.getVariable('Build.Repository.LocalPath');
        const testDirectory = tl.getVariable('Common.TestResultsDirectory');

        // Set reports directory (if necessary)
        if (reportsDirectory == sourcesDirectory)
            reportsDirectory = tl.resolve(testDirectory, 'dependency-check');
        console.log(`Setting report directory to ${reportsDirectory}`);

        // Set logs file
        logFile = tl.resolve(reportsDirectory, 'log');

        // Create report directory (if necessary)
        if (!tl.exist(reportsDirectory)) {
            console.log(`Creating report directory at ${reportsDirectory}`);
            tl.mkdirP(reportsDirectory);
        }

        // Set output folder (and filename if supplied)
        let outField: string = reportsDirectory;
        if (reportFilename && format !== undefined && format.split(',').length === 1 && format != "ALL") {
            outField = tl.resolve(reportsDirectory, reportFilename);
        }

        // Default args
        let args = `--project "${projectName}" --out "${outField}"`;

        // Scan paths
        const paths = scanPath?.split(',');
        paths?.forEach(path => {
            args += ` --scan "${path}"`;
        });

        // Exclude switch
        if (excludePath != sourcesDirectory)
            args += ` --exclude "${excludePath}"`;

        // Format types
        const outputTypes = format?.split(',');
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

        // Set the NVD API Key
        if (nvdApiKey)
            args += ` --nvdApiKey "${nvdApiKey}"`;

        // Set additionalArguments
        if (additionalArguments)
            args += ` ${additionalArguments}`;

        // Set installation location
        if (localInstallPath == sourcesDirectory) {
            hasLocalInstallation = false;
            tl.checkPath(localInstallPath, 'Dependency Check installer');

            let zipUrl: string;
            if (customRepo) {
                console.log(`Downloading Dependency Check installer from ${customRepo}...`);
                zipUrl = customRepo;
            } else {
                console.log(`Downloading Dependency Check ${dependencyCheckVersion} installer from GitHub..`);
                zipUrl = await getZipUrl(dependencyCheckVersion);
            }

            cleanLocalInstallPath(localInstallPath);
            await unzipFromUrl(zipUrl, localInstallPath);

            localInstallPath = path.join(localInstallPath, 'dependency-check');
        }

        // Pull cached data archive
        if (dataMirror) {
            // Get dependency check data dir path
            const dataDirectory = tl.resolve(localInstallPath, 'data');

            if (!tl.exist(dataDirectory)) {
                console.log(`Creating dependency check data directory at ${dataDirectory}`);
                tl.mkdirP(dataDirectory);
            }

            console.log('Downloading Dependency Check data cache archive...');
            await unzipFromUrl(dataMirror, dataDirectory);
        }

        // Get dependency check script path (.sh file for Linux and Darwin OS)
        let depCheck = 'dependency-check.sh';
        if (tl.getPlatform() == tl.Platform.Windows) depCheck = 'dependency-check.bat';
        const depCheckPath = tl.resolve(localInstallPath, 'bin', depCheck);
        console.log(`Dependency Check script set to ${depCheckPath}`);

        tl.checkPath(depCheckPath, 'Dependency Check script');

        // Console output for the log file
        console.log('Invoking Dependency Check...');
        console.log(`Path: ${depCheckPath}`);

        const maskedArgs = maskArguments(args);
        console.log(`Arguments: ${maskedArgs}`);

        // Set Java args
        const customJavaOpts = tl.getVariable('JAVA_OPTS');
        if(customJavaOpts) {
            console.log(`Dependency Check will run with custom JAVA_OPTS: ${customJavaOpts}.`)
        } else {
            tl.setVariable('JAVA_OPTS', '-Xss8192k');
        }

        // Version smoke test
        await tl.tool(depCheckPath).arg('--version').execAsync();

        if (!hasLocalInstallation) {
            // Remove lock files from potential previous canceled run if no local/centralized installation of tool is used.
            // We need this because due to a bug the dependency check tool is currently leaving .lock files around if you cancel at the wrong moment.
            // Since a per-agent installation shouldn't be able to run two scans parallel, we can safely remove all lock files still lying around.
            console.log('Searching for left over lock files...');
            const lockFiles = tl.findMatch(localInstallPath, '*.lock', null, {matchBase: true});
            if (lockFiles.length > 0) {
                console.log('found ' + lockFiles.length + ' left over lock files, removing them now...');
                lockFiles.forEach(lockfile => {
                    const fullLockFilePath = tl.resolve(lockfile);
                    try {
                        if (tl.exist(fullLockFilePath)) {
                            console.log('removing lock file "' + fullLockFilePath + '"...');
                            tl.rmRF(fullLockFilePath);
                        } else {
                            console.log('found lock file "' + fullLockFilePath + '" doesn\'t exist, that was unexpected');
                        }
                    } catch (err) {
                        console.log('could not delete lock file "' + fullLockFilePath + '"!');
                        console.error(err);
                    }
                });
            } else {
                console.log('found no left over lock files, continuing...');
            }
        }

        // Run the scan
        const exitCode = await tl.tool(depCheckPath).line(args).execAsync({ failOnStdErr: false, ignoreReturnCode: true });
        console.log(`Dependency Check completed with exit code ${exitCode}.`);
        console.log('Dependency Check reports:');
        console.log(tl.findMatch(reportsDirectory, '**/*.*'));

        // Process based on exit code
        const failed = exitCode != 0;
        const isViolation = exitCode == (dependencyCheckVersion.match(/^[0-7]\./) ? 1 : 15);

        // Process scan artifacts is required
        const processArtifacts = ((!failed || isViolation) && uploadReports);
        if (processArtifacts) {
            console.log(`##[group]Attachments`);
            tl.debug('Attachments:');
            const reports = tl.findMatch(reportsDirectory, '**/*.*');
            reports.forEach(filePath => {
                const fileName = path.basename(filePath).replace('.', '%2E');
                const fileExtension = path.extname(filePath);
                tl.debug(`Attachment name: ${fileName}`);
                tl.debug(`Attachment path: ${filePath}`);
                tl.debug(`Attachment type: ${fileExtension}`);
                tl.addAttachment('dependencycheck-artifact', fileName, filePath);
                tl.uploadArtifact('dependency-check', filePath, 'Dependency Check')

                if (uploadSARIFReport && fileExtension.toLowerCase() === '.sarif') {
                    tl.debug(`Uploaded SARIF attachment: ${filePath}`);
                    tl.uploadArtifact('OWASPDependencyCheck', filePath, 'CodeAnalysisLogs')
                }
            })
            console.log(`##[endgroup]`);
        }

        let message = "Dependency Check succeeded"
        let result = tl.TaskResult.Succeeded
        if (failed) {
            if (isViolation) {
                message = "CVSS threshold violation.";

                if (warnOnCVSSViolation) {
                    result = tl.TaskResult.SucceededWithIssues
                } else {
                    result = tl.TaskResult.Failed
                }
            } else {
                message = "Dependency Check exited with an error code (exit code: " + exitCode + ")."
                result = tl.TaskResult.Failed
            }
        }

        let consoleMessage = 'Dependency Check ';
        switch (result) {
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
    } catch (err) {
        if (err instanceof Error) {
            console.log(err.message);
            tl.error(err.message);
        }
        tl.setResult(tl.TaskResult.Failed, 'Unhandled error condition detected.');
    } finally {
        // Upload logs
        if (enableVerbose && logFile !== "" && tl.exist(logFile))
            tl.uploadBuildLog(logFile);
    }

    console.log("Ending Dependency Check...");
}

function cleanLocalInstallPath(localInstallPath: string) {
    const files = tl.findMatch(localInstallPath, ['**', '!data', '!data/**']);
    files.forEach(file => tl.rmRF(file));
}

async function getZipUrl(version: string): Promise<string> {
    let url = `${releaseApi}/tags/v${version}`;
    if (version == 'latest') url = `${releaseApi}/${version}`;

    const response = await client.get(url);
    const releaseInfo = JSON.parse(await response.readBody());
    const asset = releaseInfo['assets'].find((asset: {
        [x: string]: string;
    }) => asset['content_type'] == 'application/zip');

    return asset['browser_download_url'] as string;
}

function maskArguments(args: string): string {
    const argumentsName = ['nvdApiKey', 'nvdPassword', 'retirejsPassword', 'ossIndexPassword', 'artifactoryApiToken', 'artifactoryBearerToken', 'nexusPass', 'dbPassword']
    let maskedArguments = args;
    argumentsName.forEach((argumentName) => {
        const pattern = new RegExp(`(--${argumentName}\\s+)(["']?.+?["']?)(?=\\s+--|$)`, 'gi');
        maskedArguments = maskedArguments.replace(pattern, '$1***');
    });
    return maskedArguments;
}

async function unzipFromUrl(zipUrl: string, unzipLocation: string): Promise<void> {
    const fileName = path.basename(new URL(zipUrl).pathname);
    const zipLocation = tl.resolve(fileName)
    let tmpError = null;
    let response: IHttpClientResponse = null;
    let downloadErrorRetries = 5;

    do {
        tmpError = null;
        try {
            console.log('Downloading ZIP from "' + zipUrl + '"...');
            response = await client.get(zipUrl);
            tl.debug('done downloading');
        }
        catch(error) {
            tmpError = error;
            downloadErrorRetries--;
            console.error('Error trying to download ZIP (' + (downloadErrorRetries+1) + ' tries left)');
            console.error(error);
        }
    }
    while(tmpError !== null && downloadErrorRetries >= 0);

    if(tmpError !== null) {
        throw tmpError;
    }

    tl.debug('Download was successful, saving downloaded ZIP file...');

    await new Promise<void>(function (resolve, reject) {
        const writer = fs.createWriteStream(zipLocation);
        writer.on('error', err => reject(err));
        writer.on('finish', () => resolve());
        response.message.pipe(writer);
    });

    tl.debug('Downloaded ZIP file has been saved, unzipping now...');

    await unzipFromFile(zipLocation, unzipLocation);

    tl.debug('Unzipping complete, removing ZIP file now...');

    tl.rmRF(zipLocation);

    tl.debug('ZIP file has been removed');
}

async function unzipFromFile(zipLocation: string, unzipLocation: string): Promise<void> {
    await new Promise<void>(function (resolve, reject) {
        tl.debug('Extracting ' + zipLocation + ' to ' + unzipLocation);

        decompress(zipLocation, unzipLocation).then(() => {
            tl.debug('Extracted ' + zipLocation + ' to ' + unzipLocation + ' successfully');
            return resolve();
        }).catch((err: any) => reject(err));
    });
}

void run();