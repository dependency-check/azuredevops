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
    $additionalArguments = Get-VstsInput -Name 'additionalArguments' -Default ''

    #Trim the strings
    $projectName = $projectName.Trim();
    $scanPath = $scanPath.Trim();
    $excludePath = $excludePath.Trim();
    $suppressionPath = $suppressionPath.Trim();
    $additionalArguments = $additionalArguments.Trim();

    # Default args
    $arguments = "--project ""$projectName"" --scan $scanPath --out ./dependency-check" 

    # Exclude switch
    if([string]::IsNullOrEmpty($excludePath) -eq $false ) {
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
    if([string]::IsNullOrEmpty($suppressionPath) -eq $false ) {
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

    # additionalArguments
    if([string]::IsNullOrEmpty($additionalArguments) -eq $false ) {
        $arguments = $arguments + " $suppressionPath"
    }

    #Get dependency check script path
    $depCheck = "dependency-check.bat"    
    $depCheckScripts = "dependency-check/bin"
    $depCheckPath = $depCheckScripts | Resolve-Path | Join-Path -ChildPath "$depCheck"
    
    $failed = $false
    if (Test-Path $depCheckPath -PathType Leaf) {
        
        #Console output for the log file
        Write-Host -Verbose "Invoking Dependency Check..."
        Write-Host -Verbose "Arguments: $arguments"

        # Run the scan
        #$exitcode = (Start-Process -FilePath $depCheckPath -ArgumentList $arguments -PassThru -Wait -NoNewWindow).ExitCode
        
        # Process based on exit code
        #$message = "Dependency Check exited with an error code."
        #$failed = $false
        #$processArtifacts = $true

        # Error severity / thresholds. Need to fail task, but still process artifacts
        #if ($exitcode -eq 4 -or $exitcode -eq 6 -or $exitcode -eq 7 -or $exitcode -eq 8) {
        #    $failed = $true
        #    $processArtifacts = $true
        #    $message = "CVSS threshold violation."
        #}
        #elseif ($exitcode -ne 0) {
        #    $processArtifacts = $false
        #    $failed = $true
        #}
        
        # Process scan artifacts is required
        #if ($processArtifacts -eq $true) {
        #    $outputTypes = $scanResultsFormat.Split(",")

            #Write-Debug "Attachments:"
            #foreach($outputType in $outputTypes)
            #{
            #    $scanresultspath = "$outputFilename.$outputType"
            #    $scanresultfilename = (Get-Item $scanresultspath ).Name
            #    $scanresultfilename = $scanresultfilename.Replace(".", "%2E")
            #    Write-Debug "attachment name: $scanresultfilename"    
            #    Write-Debug "attachment path: $scanresultspath"  
            #    Write-Debug "attachment type: $outputType"  
            #    Write-Host "##vso[task.addattachment type=dependencycheck-artifact;name=$scanresultfilename;]$scanresultspath"
            #    Write-Host "##vso[artifact.upload containerfolder=dependency-check;artifactname=Dependency Check;]$scanresultspath"
            #}   
            
            #upload logs
            #Get-ChildItem -Path *.log -Recurse -Force | 
            #Foreach-Object {
            #    Write-Host "##vso[build.uploadlog]$_"                
            #}           
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
    Write-VstsSetResult -Result 'Failed' -Message "Unhandled error condition detected" -DoNotThrow
} finally {
	Trace-VstsLeavingInvocation $MyInvocation
}
 
Write-Output "Ending Dependency Check..."