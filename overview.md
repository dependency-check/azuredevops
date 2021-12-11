# OWASP Dependency Check

Dependency-Check is a software composition analysis utility that identifies project dependencies and checks if there are any known, publicly disclosed, vulnerabilities. Currently, Java and .NET are supported; additional experimental support has been added for Ruby, Node.js, Python, and limited support for C/C++ build systems (autoconf and cmake). The tool can be part of a solution to the [OWASP Top 10 2017 A9-Using Components with Known Vulnerabilities](https://www.owasp.org/index.php/Top_10-2017_A9-Using_Components_with_Known_Vulnerabilities) previously known as [OWASP Top 10 2013 A9-Using Components with Known Vulnerabilities](https://www.owasp.org/index.php/Top_10_2013-A9-Using_Components_with_Known_Vulnerabilities).

The OWASP Dependency Check Azure DevOps Extension enables the following features in an Azure Build Pipeline:

- Software composition analysis runs against package references during build on both Windows and Linux build agents.

- Export vulnerability data to HTML, JSON, XML, CSV, JUnit, Sarif formatted reports

- Download vulnerability reports from the build's artifacts

## GitHub Repository

The extension maintainers do not monitor the Marketplace Question & Answers. Please use the [Azure DevOps Dependency Check](https://github.com/dependency-check/azuredevops) repository for questions, issues, or enhancements.

## Installation and Configuration

- Install the [OWASP Dependency Check](https://marketplace.visualstudio.com/items?itemName=dependency-check.dependencycheck) extension into your Azure DevOps Organization.

- Open an Azure DevOps project and browse to the **Pipelines** / **Builds**.

- Press the **Edit** button to modify the pipeline definition.

- Press the **+** icon to add a new **OWASP Dependency Check** build task.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/buildtask-new.png">

- Search for the **OWASP Dependency Check** task and press the **Add** button.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/buildtask-add.png">

- Configure the build task with the appropriate [Dependency Check Command Line Arguments](https://jeremylong.github.io/DependencyCheck/dependency-check-cli/arguments.html).

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/buildtask-configure.png">

## Executing Dependency Check

- Execute the pipeline and wait for the build to complete.

- Review the build logs and ensure the the Dependency Check task successfully completed.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/build-success.png">

- Click on the Dependency Check build task to view the build output.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/build-output.png">

## Dependency Check Reports

- Each of the selected report formats are uploaded to the **Artifacts** for downloading.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/build-artifacts.png">

- Select **Dependency Check** to open the **Artifact Explorer** and download the Dependency Check reports.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/build-artifacts-explorer.png">

- Dependency Check supports exporting the results to JUNIT formatted test results. To parse the JUNIT test results, create a new **Publish Test Results** build task with the following configuration.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/buildtask-tests.png">

- View the **Tests** screen to view the passing and failing Dependency Check tests.

    <img src="https://raw.githubusercontent.com/dependency-check/azuredevops/main/screenshots/build-tests.png">

## SARIF display in Summary

You can display the dependency check report nicely in your Pipeline run summary. To realize it set `format` to `sarif` and make sure your Azure DevOps organization has [SARIF SAST Scans Tab](https://marketplace.visualstudio.com/items?itemName=sariftools.scans) extension installed.

## Learn More

More details on configuring and running Dependency Check can be found at [https://jeremylong.github.io/DependencyCheck/](https://jeremylong.github.io/DependencyCheck/).

## Supported Environments

- The Dependency Check Azure DevOps extension has been converted to TypeScript as of version 6.0. With this update, both Linux and Windows build agents are supported.

## Contributors

First thank [Jeremy Long](https://twitter.com/ctxt) and the folks working on the [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/) project.

The following contributor(s) help maintain the Azure DevOps extension:

- Eric Johnson ([@emjohn20](https://twitter.com/emjohn20)) - Principal Security Engineer, Puma Security

- Even Schjølberg, Upheads

- [Alain Croisetiere](https://github.com/alaincroisetiere)
