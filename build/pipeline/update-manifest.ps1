Try {
    $branch = $env:BUILD_SOURCE_BRANCH
    $branchName = $env:BUILD_SOURCE_BRANCH_NAME
    $vsixTempFolder = $env:VSIX_TEMP_FOLDER
    $sourceFolder = $env:SOURCE_FOLDER

    Write-Host "Branch: $branch"
    Write-Host "Branch name: $branchName"
    Write-Host "VSIX temporary folder: $vsixTempFolder"
    Write-Host "Source folder: $sourceFolder"

    if ($branch -match "refs/heads/feature/.*") {
        $TaskId = "04450B31-9F11-415A-B37A-514D69EF69A1"
        $TaskName = "dependency-check-build-task-dev"
        $Logo = "images/logo-dev-128x128.png"
    }
    elseif ($branch -match "refs/heads/hotfix/.*") {
        $TaskId = "34231D1C-069A-4EDF-BD2C-6F0F57B660D6"
        $TaskName = "dependency-check-build-task-hotfix"
        $Logo = "images/logo-hotfix-128x128.png"
    }

    # Update extension.vsomanifest
    $VsoManifestPath = Join-Path -Path $vsixTempFolder -ChildPath "extension.vsomanifest" -ErrorAction Stop
    Write-Host "Reading extension.vsomanifest"
    $VsoJson = Get-Content -Path $VsoManifestPath -Raw | ConvertFrom-Json
    Write-Host "Setting vso parameters"
    $VsoJson.licensing.overrides[0].id = $TaskName
    $VsoJson.contributions[0].id = $TaskName
    Write-Host "Saving new extension.vsomanifest"
    $VsoJson | ConvertTo-Json -Depth 100 | Set-Content -Path $VsoManifestPath

    # Update logo
    Write-Host "Replace logo image"
    $LogoSourcePath = Join-Path -Path $sourceFolder -ChildPath $Logo -ErrorAction Stop
    $LogoDestinationPath = Join-Path -Path $vsixTempFolder -ChildPath "images/logo-128x128.png" -ErrorAction Stop
    Copy-Item -Path $LogoSourcePath -Destination $LogoDestinationPath

    # Update task definition
    $TaskDefPath = Join-Path -Path $vsixTempFolder -ChildPath "Tasks/DependencyCheck/task.json" -ErrorAction Stop
    Write-Host "Reading task.json"
    $TaskJson = Get-Content -Path $TaskDefPath -Raw | ConvertFrom-Json
    Write-Host "Setting task definition id and name"
    $TaskJson.id = $TaskId
    $TaskJson.name = $TaskName
    Write-Host "Saving new task definition"
    $TaskJson | ConvertTo-Json -Depth 100 | Set-Content -Path $TaskDefPath
} catch {
    $errorMessage = "Error on update manifest: {0}" -f $_.Exception.Message
    Write-Output $errorMessage
    exit(1)
}