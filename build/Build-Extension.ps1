
<#PSScriptInfo

.VERSION 1.0.0

.GUID 6312d879-4b8c-4d88-aa39-bf245069148e

.AUTHOR Markus Szumovski

.COMPANYNAME -

.COPYRIGHT 2021

.TAGS

.LICENSEURI

.PROJECTURI

.ICONURI

.EXTERNALMODULEDEPENDENCIES 

.REQUIREDSCRIPTS

.EXTERNALSCRIPTDEPENDENCIES

.RELEASENOTES
V 1.0.0: Initial version

.PRIVATEDATA

#> 

<# 

.SYNOPSIS
    Will build the extension.
.DESCRIPTION 
    Will build the extension.
.PARAMETER ExtensionRepositoryRoot
    The path to the extension repository root from where to build the extension from.
    Will default to parent directory of script if no path or $null was provided.
.PARAMETER BuildEnvironment
    Set to "Release" for production environment or set to anything else (for example "Development") for development environment.
    If nothing was provided the Release environment will be built.
.PARAMETER BuildVersion
    If provided will set the version number.
    If not provided the version number will not be changed.
.PARAMETER NoPackaging
    If the switch was provided, the built extension will not be packaged up into a vsix file.
.OUTPUTS
    Building and packaging progress
  
.EXAMPLE
  Build-Extension -BuildVersion "6.1.0.1" -BuildEnvironment "Release" 
#> 
[CmdletBinding(SupportsShouldProcess=$True)]
Param
(
    [Parameter(Position=0)]
    [string] $ExtensionRepositoryRoot = $null,
    [Parameter(Position=1)]
    [string] $BuildEnvironment = "Release",
    [Parameter(Position=2)]
    [string] $BuildVersion = $null,
    [Parameter(Position=3)]
    [switch] $NoPackaging

)

### --- START --- functions
### --- END --- functions

### --- START --- main script ###
try {
    Write-Host "--- Build extension script started ---`r`n`r`n" -ForegroundColor DarkGreen

    if([string]::IsNullOrWhiteSpace($ExtensionRepositoryRoot)) {
        Write-Host "No extension repository root provided, determining path now..."
        $ExtensionRepositoryRoot = Split-Path -Path (Split-Path -Path $MyInvocation.MyCommand.Path -Parent -ErrorAction Stop) -Parent -ErrorAction Stop
        Write-Host ""
    }
    else {
        $ExtensionRepositoryRoot = Resolve-Path -Path $ExtensionRepositoryRoot -ErrorAction Ignore
    }

    if([string]::IsNullOrWhiteSpace($BuildEnvironment)) {
        $BuildEnvironment = "Release"
    }

    # Set build env vars
    if ($BuildEnvironment -eq "Release") {
        $TaskId = "47EA1F4A-57BA-414A-B12E-C44F42765E72"
        $TaskName = "dependency-check-build-task"
        $VssExtensionName = "vss-extension.prod.json"
    }
    else {
        $TaskId = "04450B31-9F11-415A-B37A-514D69EF69A1"
        $TaskName = "dependency-check-build-task-dev"
        $VssExtensionName = "vss-extension.dev.json"
    }

    $ExtensionRepositoryRootExists = Test-Path -Path $ExtensionRepositoryRoot -ErrorAction Ignore

    if($ExtensionRepositoryRootExists) {
        $TaskFolderPath = Join-Path -Path $ExtensionRepositoryRoot -ChildPath "src\Tasks\dependency-check-build-task" -ErrorAction Stop

        $TaskDefPath = Join-Path -Path $TaskFolderPath -ChildPath "task.json" -ErrorAction Stop
        $TaskDefExists = Test-Path -Path $TaskDefPath -ErrorAction Ignore

        $VssExtensionPath = Join-Path -Path $ExtensionRepositoryRoot -ChildPath $VssExtensionName -ErrorAction Stop
        $VssExtensionExists = Test-Path -Path $VssExtensionPath -ErrorAction Ignore
    }
    else {
        $TaskFolderPath = $null
        $TaskDefPath = $null
        $TaskDefExists = $false
        $VssExtensionPath = $null
        $VssExtensionExists = $false
    }

    #Parse version vars
    $VerPatchRevision = $null
    if(![string]::IsNullOrWhiteSpace($BuildVersion)) {
        $VerMajor,$VerMinor,$VerPatch,$VerRevision = $BuildVersion.Split('.')
        if($null -eq $VerMajor) {
            $VerMajor = 0
        }
        if($null -eq $VerMinor) {
            $VerMinor = 0
        }
        if($null -eq $VerPatch) {
            $VerPatch = 0
        }
        if($null -eq $VerRevision) {
            $VerRevision = 0
        }
        $VerPatchRevision = [string]::Format("{0}{1}", $VerPatch, $VerRevision.PadLeft(3, '0'))
        $BuildVersion = "$VerMajor.$VerMinor.$VerPatch.$VerRevision"
        $BuildTaskVersion = "$VerMajor.$VerMinor.$VerPatchRevision"
    }


    Write-Host "------------------------------"

    Write-Host "Extension repository root: ""$ExtensionRepositoryRoot"" (" -NoNewline
    if($ExtensionRepositoryRootExists) {
        Write-Host "exists" -ForegroundColor Green -NoNewline
    }
    else {
        Write-Host "missing" -ForegroundColor Red -NoNewline
    }
    Write-Host ")"

    Write-Host "Task definition JSON: ""$TaskDefPath"" (" -NoNewline
    if($TaskDefExists) {
        Write-Host "exists" -ForegroundColor Green -NoNewline
    }
    else {
        Write-Host "missing" -ForegroundColor Red -NoNewline
    }
    Write-Host ")"

    Write-Host "VSS extension JSON: ""$VssExtensionPath"" (" -NoNewline
    if($VssExtensionExists) {
        Write-Host "exists" -ForegroundColor Green -NoNewline
    }
    else {
        Write-Host "missing" -ForegroundColor Red -NoNewline
    }
    Write-Host ")"

    Write-Host "Build environment: $BuildEnvironment"
    if([string]::IsNullOrWhiteSpace($BuildVersion)) {
        Write-Host "Build version: <none defined>"
    }
    else {
        Write-Host "Build version: $BuildVersion"
        Write-Host "Build-Task version: $BuildTaskVersion"
    }

    Write-Host "Task-Id: $TaskId"
    Write-Host "Task-Name: $TaskName"
    Write-Host "VSS extension JSON: $VssExtensionName"

    Write-Host "------------------------------`r`n"

    if($ExtensionRepositoryRootExists) {
        if($TaskDefExists) {

            Write-Host "Reading task.json..."
            $TaskJson = Get-Content -Path $TaskDefPath -Raw | ConvertFrom-Json

            Write-Host "Setting task definition id and name..."
            $TaskJson.id = $TaskId
            $TaskJson.name = $TaskName

            if([string]::IsNullOrWhiteSpace($BuildVersion)) {
                Write-Host "(Skipping setting of task definition version since no version was provided)"
            }
            else {
                Write-Host "Setting task definition version..."
                $TaskJson.version.Major = $VerMajor
                $TaskJson.version.Minor = $VerMinor
                $TaskJson.version.Patch = $VerPatchRevision
            }

            Write-Host "Saving new task definition..."
            $TaskJson | ConvertTo-Json -Depth 100 | Set-Content -Path $TaskDefPath

            if([string]::IsNullOrWhiteSpace($BuildVersion)) {
                Write-Host "(Skipping setting of extension version since no version was provided)"
            }
            else {
                Write-Host "Reading ""$VssExtensionName""..."
                $VssExtensionJson = Get-Content -Path $VssExtensionPath -Raw | ConvertFrom-Json

                Write-Host "Setting version"
                $VssExtensionJson.version = $BuildVersion

                Write-Host "Saving new extension definition..."
                $VssExtensionJson | ConvertTo-Json -Depth 100 | Set-Content $VssExtensionPath
            }

            Write-Host "`r`nBuilding task..."
            Write-Host "------------------------------"
            Push-Location
            Set-Location -Path $TaskFolderPath
            &"npm" install
            &"npm" run build
            Pop-Location
            Write-Host "------------------------------"
            Write-Host "`r`nBuilding extension..."
            Write-Host "------------------------------"
            &"npm" install
            &"npm" run build
            Write-Host "------------------------------"

            if(!$NoPackaging.IsPresent) {
                Write-Host "`r`nPackaging..."
                if($BuildEnvironment -eq "Release") {
                    &"npm" run package-prod
                }
                else {
                    &"npm" run package-dev
                }
    
                Write-Host "`r`nBuilding and packaging extension..." -NoNewline    
            }
            else {
                Write-Host "`r`nBuilding extension..." -NoNewline    
            }

            Write-Host "DONE" -ForegroundColor Green
        }
        else {
            Write-Warning "Task.json not found, cannot continue"
        }
    }
    else {
        Write-Warning "Extension repository root not found, cannot continue"
    }
}
finally {
    Write-Host "`r`n`r`n--- Build extension script ended ---" -ForegroundColor DarkGreen
}

#and we're at the end

### --- END --- main script ###
