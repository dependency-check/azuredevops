# OWASP Dependency Check Azure DevOps Extension

Build and deployment are automated through the use of an Azure DevOps Pipeline.

## Azure DevOps Pipeline

The pipeline needs a library called **"DependencyCheck-AzureDevOps"** with the following variables:

| Name                      | Value                  | Description                                                                     |
|---------------------------|------------------------|---------------------------------------------------------------------------------|
| extensionFileName         | dependency-check.vsix  | Extension file name                                                             |
| extensionId               | dependencycheck        | Extension Id                                                                    |
| extensionName             | OWASP Dependency Check | Extension name                                                                  |
| gitHubConnectionName      | ***                    | GitHub connection name on Azure DevOps "Service connections"                    |
| marketplaceConnectionName | ***                    | Visual Studio Marketplace connection name on Azure DevOps "Service connections" |
| publisher                 | dependency-check       | Publisher used to publish on Visual Studio Marketplace                          |
| shareWith                 | ***                    | Comma separated list of Organization Ids to share non-production extension      |

The pipeline publishes a new release version every time a new tag is created on the repository.

### Prerequisites

For the correct execution of the pipeline must be installed in the organization the "[Azure DevOps Extension Tasks](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.vsts-developer-tools-build-tasks)" extension available in the Visual Studio Marketplace