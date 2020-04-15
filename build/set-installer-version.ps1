if ([string]::IsNullOrWhiteSpace($env:BUILD_VERSION)) {
	Write-Host "Error: Major version number environment variable is required"
	exit 1
}

if ([string]::IsNullOrWhiteSpace($env:BUILD_ENVIRONMENT)) {
	Write-Host "Error: Build environment variable is required"
	exit 2
}

$taskDefPath = ".\src\Tasks\dependency-check-build-task\task.json"
if (!(Test-Path $taskDefPath -PathType Leaf)) {
	Write-Host "Error: $taskDefPath not found"
	exit 3
}

# Set build env vars
if ($env:BUILD_ENVIRONMENT -eq "Release") {
	$taskId = "47EA1F4A-57BA-414A-B12E-C44F42765E72"
	$taskName = "dependency-check-build-task"
	$vssExtensionPath = ".\vss-extension.prod.json"
}
else {
	$taskId = "04450B31-9F11-415A-B37A-514D69EF69A1"
	$taskName = "dependency-check-build-task-dev"
	$vssExtensionPath = ".\vss-extension.dev.json"
}

#Parse version vars
$versionMajor,$versionMinor,$versionPatch,$versionRevision = $env:BUILD_VERSION.Split('.')
$versionPatchRevision = [string]::Format("{0}{1}", $versionPatch, $versionRevision.PadLeft(3, '0'))

if (!(Test-Path $vssExtensionPath -PathType Leaf)) {
	Write-Host "Error: $vssExtensionPath not found"
	exit 4
}

Write-Host "Setting build environment for $env:BUILD_ENVIRONMENT"
Write-Host "Setting extension version: $env:BUILD_VERSION"
Write-Host "Setting build task version: $versionMajor.$versionMinor.$versionPatchRevision"

# task.json (set build task id / name)
Write-Host "Reading task.json"
$task = Get-Content $taskDefPath -raw | ConvertFrom-Json

Write-Host "Setting task definition id and name"
$task.id = $taskId
$task.name = $taskName

Write-Host "Setting task definition version"
$task.version.Major = $versionMajor
$task.version.Minor = $versionMinor
$task.version.Patch = $versionPatchRevision

Write-Host "Saving new task definition..."
$task | ConvertTo-Json -depth 32| set-content $taskDefPath

# vss-extension-[env].json (set vesion)
Write-Host "Reading $vssExtensionPath"
$vssExtension = Get-Content $vssExtensionPath -raw | ConvertFrom-Json

Write-Host "Setting version"
$vssExtension.version = $env:BUILD_VERSION

Write-Host "Saving new task definition..."
$vssExtension | ConvertTo-Json -depth 32| set-content $vssExtensionPath
