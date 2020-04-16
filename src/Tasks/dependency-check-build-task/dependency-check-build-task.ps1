#
# dependency-check-build-task.ps1
#
[CmdletBinding(DefaultParameterSetName = 'None')]
param(
	[string][Parameter(Mandatory=$false)] $projectName,
	[string][Parameter(Mandatory=$false)] $scanPath, 
	[string][Parameter(Mandatory=$false)] $excludePath, 
    [string][Parameter(Mandatory=$false)] $format, 
    [string][Parameter(Mandatory=$false)] $failOnCVSS,     
    [string][Parameter(Mandatory=$false)] $suppressionPath,
    [string][Parameter(Mandatory=$false)] $enableExperimental,
    [string][Parameter(Mandatory=$false)] $enableRetired,
    [string][Parameter(Mandatory=$false)] $additionalArguments
)
# To test locally Run:
# Install-Module -Name VstsTaskSdk
# Import-Module VstsTaskSdk
# Invoke-VstsTaskScript -ScriptBlock { ./Tasks/dependency-check-build-task/dependency-check-build-task.ps1 } -Verbose

function not-exist { -not (Test-Path $args) }
Set-Alias !exist not-exist -Option "Constant, AllScope"
Set-Alias exist Test-Path -Option "Constant, AllScope"

Write-Output "Starting Dependency Check..."
Trace-VstsEnteringInvocation $MyInvocation
try {
    #Get inputs from build task.
    $projectName = Get-VstsInput -Name 'projectName' -Require 
    $scanPath = Get-VstsInput -Name 'scanPath' -Require
    $excludePath = Get-VstsInput -Name 'excludePath' -Default ''
    $format = Get-VstsInput -Name 'format' -Require
    $failOnCVSS = Get-VstsInput -Name 'failOnCVSS' -Default ''
    $suppressionPath = Get-VstsInput -Name 'suppressionPath' -Default ''
    $enableExperimental = Get-VstsInput -Name 'enableExperimental' -Require -AsBool
    $enableRetired = Get-VstsInput -Name 'enableRetired' -Require -AsBool
    $enableVerbose = Get-VstsInput -Name 'enableVerbose' -Require -AsBool
    $dataMirrorJson = Get-VstsInput -Name 'dataMirrorJson' -Default ''
    $dataMirrorOdc = Get-VstsInput -Name 'dataMirrorOdc' -Default ''
    $additionalArguments = Get-VstsInput -Name 'additionalArguments' -Default ''

    #Trim the strings
    $projectName = $projectName.Trim();
    $scanPath = $scanPath.Trim();
    $excludePath = $excludePath.Trim();
    $suppressionPath = $suppressionPath.Trim();
    $additionalArguments = $additionalArguments.Trim();

    #Create reports directory
    $testDirectory = $Env:COMMON_TESTRESULTSDIRECTORY
    $reportsDirectory = "$testDirectory\dependency-check"

    # Check if report directory does not exist
    if(!(Test-Path -Path $reportsDirectory))
    {
        Write-Host "Creating dependency check test results directory at $reportsDirectory"
        New-Item $reportsDirectory -Type Directory
    }

    # Default args
    $arguments = "--project ""$projectName"" --scan ""$scanPath"" --out ""$reportsDirectory"""

    # Exclude switch
    if ($Env:BUILD_REPOSITORY_LOCALPATH -ne $excludePath){
        $arguments = $arguments + " --exclude ""$excludePath"""
    }
    
    # Format types
    $outputTypes = $format.Split(",")
    foreach($outputType in $outputTypes)
    {
        $arguments = $arguments + " --format $outputType"
    }

    # Fail on CVSS switch
    [int]$failOnCVSSValue = 0
    [bool]$resultCVSSValue = [int]::TryParse($failOnCVSS, [ref]$failOnCVSSValue)
    
    if( $resultCVSSValue -eq $true ){
        $arguments = $arguments + " --failOnCVSS $failOnCVSSValue"
    }

    # Suppression switch
    if ($Env:BUILD_REPOSITORY_LOCALPATH -ne $suppressionPath){
        $arguments = $arguments + " --suppression ""$suppressionPath"""
    }

    #Set enableExperimental option if requested
    if ($enableExperimental -eq $true){
        $arguments = $arguments + " --enableExperimental"
    }

    #Set enableRetired option if requested
    if ($enableRetired -eq $true){
        $arguments = $arguments + " --enableRetired"
    }

    #Set log switch if requested
    if($enableVerbose -eq $true) {
        $arguments = $arguments + " --log ""$reportsDirectory\log"""
    }

    # additionalArguments
    if([string]::IsNullOrEmpty($additionalArguments) -eq $false ) {
        $arguments = $arguments + " " + $additionalArguments
    }

    #Get dependency check path
    $binDirectory = "dependency-check"
    $binDirectory = $binDirectory | Resolve-Path

    #Set PS invoke web args
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'

    # Pull installer file
    if(Test-Path $binDirectory -PathType Container) {
        Write-Host -Verbose "Downloading Dependency Check installer..."
        Invoke-WebRequest "https://dl.bintray.com/jeremy-long/owasp/dependency-check-5.3.2-release.zip" -OutFile "dependency-check-5.3.2-release.zip"
        Expand-Archive -Path dependency-check-5.3.2-release.zip -DestinationPath . -Force
    }

    #Get dependency check data dir path
    $dataDirectory = "dependency-check/data"
    $dataDirectoryPath = $dataDirectory | Resolve-Path
    
    # Pull JSON cached file
    if([string]::IsNullOrEmpty($dataMirrorJson) -eq $false ) {
        if(Test-Path $dataDirectoryPath -PathType Container) {
            Write-Host -Verbose "Downloading Dependency Check vulnerability JSON data mirror..."
            Invoke-WebRequest $dataMirrorJson -OutFile "$dataDirectory/jsrepository.json"
        }
    }

    # Pull ODC cached file
    if([string]::IsNullOrEmpty($dataMirrorOdc) -eq $false ) {
        if(Test-Path $dataDirectoryPath -PathType Container) {
            Write-Host -Verbose "Downloading Dependency Check vulnerability DB data mirror..."
            Invoke-WebRequest $dataMirrorOdc -OutFile "$dataDirectory/odc.mv.db"
        }
    }

    #Get dependency check script path
    $depCheck = "dependency-check.bat"    
    $depCheckScripts = "dependency-check/bin"
    $depCheckPath = $depCheckScripts | Resolve-Path | Join-Path -ChildPath "$depCheck"
    
    #Default status to pass, change evaling the exit code below
    $failed = $false

    if (Test-Path $depCheckPath -PathType Leaf) {
        
        #Console output for the log file
        Write-Host -Verbose "Invoking Dependency Check..."
        Write-Host -Verbose "Path: $depCheckPath"
        Write-Host -Verbose "Arguments: $arguments"

        # Run the scan
        $exitcode = (Start-Process -FilePath $depCheckPath -ArgumentList $arguments -PassThru -Wait -NoNewWindow).ExitCode
        Write-Host -Verbose "Dependency Check completed with exit code $exitcode."
        Write-Host -Verbose "Dependency check reports:"
        Get-ChildItem $reportsDirectory

        # Process based on exit code
        $message = "Dependency Check exited with an error code."
        $processArtifacts = $true

        # Error severity / thresholds. Need to fail task, but still process artifacts
        if ($exitcode -ne 0) {
            
            if($resultCVSSValue -eq $true -and $exitcode -eq 1) {
                $failed = $true
                $processArtifacts = $true
                $message = "CVSS threshold violation."
            }
            else {
                $processArtifacts = $false
                $failed = $true
            }
        }
        
        # Process scan artifacts is required
        if ($processArtifacts -eq $true) {
            
            Write-Debug "Attachments:"
            Get-ChildItem -Path $reportsDirectory -Recurse -Force | 
            Foreach-Object {
                $filePath = $_.FullName
                $fileName = $_.Name.Replace(".", "%2E")
                Write-Debug "Attachment name: $fileName"    
                Write-Debug "Attachment path: $filePath"  
                Write-Debug "Attachment type: $_.Extension"  
                Write-Host "##vso[task.addattachment type=dependencycheck-artifact;name=$fileName;]$filePath"
                Write-Host "##vso[artifact.upload containerfolder=dependency-check;artifactname=Dependency Check;]$filePath"
            }   
            
            #upload logs
            if($enableVerbose -eq $true) {
                Get-ChildItem -Path "$reportsDirectory\log" -Recurse -Force | 
                Foreach-Object {
                    Write-Host "##vso[build.uploadlog]$_"                
                }
            }
        }
    } 
    else {
        Write-VstsTaskError -Message "File not foud: $depCheckPath" 
    }
   
    if ($failed)
    {
        Write-VstsTaskError -Message $message
        Write-VstsSetResult -Result 'Failed' -Message $message -DoNotThrow
    }
} catch {
    
    Write-Verbose "STDERR: $($_.Exception.Message)"
    Write-VstsTaskError $_.Exception
    Write-VstsSetResult -Result 'Failed' -Message "Unhandled error condition detected." -DoNotThrow
} finally {
	Trace-VstsLeavingInvocation $MyInvocation
}
 
Write-Output "Ending Dependency Check..."