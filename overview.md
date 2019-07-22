# OWASP Dependency Check

Dependency-Check is a software composition analysis utility that identifies project dependencies and checks if there are any known, publicly disclosed, vulnerabilities. Currently, Java and .NET are supported; additional experimental support has been added for Ruby, Node.js, Python, and limited support for C/C++ build systems (autoconf and cmake). The tool can be part of a solution to the [OWASP Top 10 2017 A9-Using Components with Known Vulnerabilities](https://www.owasp.org/index.php/Top_10-2017_A9-Using_Components_with_Known_Vulnerabilities) previously known as [OWASP Top 10 2013 A9-Using Components with Known Vulnerabilities](https://www.owasp.org/index.php/Top_10_2013-A9-Using_Components_with_Known_Vulnerabilities).

The OWASP Dependency Check Azure DevOps Extension enables the following features in an Azure Build Pipeline:

- Software composition analysis runs against package references during each build

- Vulnerability data to HTML, JSON, XML, CSV, JUnit formatted reports

- Download vulnerability reports from the build's artifacts

## Learn More

More details on configuring and running Dependency Check can be found at [https://jeremylong.github.io/DependencyCheck/](https://jeremylong.github.io/DependencyCheck/).

## Supported Environments

- Azure DevOps Agents must be running at least version 2.0 of the TFS agent.

## Contributors

Thank you to the following contributor(s) for this extension:

- Eric Johnson (@emjohn20) - Principal Security Engineer, Puma Security

![](/static/images/report.png)