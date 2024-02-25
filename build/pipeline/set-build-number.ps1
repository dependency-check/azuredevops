Try
{
    $buildReason = $env:BUILD_REASON
    $branch = $env:BUILD_SOURCE_BRANCH
    $branchName = $env:BUILD_SOURCE_BRANCH_NAME
    $commitNumber = (git rev-list --count HEAD)

    Write-Host "Branch: $branch"
    Write-Host "Branch name: $branchName"
    Write-Host "Build reason: $buildReason"
    Write-Host "Commit number: $commitNumber"

    if (-Not$branchName -imatch '\A[0-9]+\.[0-9]+\.[0-9]+\z')
    {
        throw "The branch name must respect the version number [0-9]+.[0-9]+.[0-9]+"
    }

    if ($branch -match "refs/tags/.*")
    {
        $buildNumber = "${branchName}.${commitNumber}"
    }
    elseif ($branch -match "refs/heads/feature/.*")
    {
        $buildNumber = "${branchName}.${commitNumber}-feature"
    }
    elseif ($branch -match "refs/heads/hotfix/.*")
    {
        $buildNumber = "${branchName}.${commitNumber}-hotfix"
    }
    else {
        throw "Branch not match configured build capabilities"
    }

    Write-Host "BuildNumber: $buildNumber"

    Write-Host "##vso[build.updatebuildnumber]$($buildNumber)"
} catch {
    $errorMessage = "Error on set build number: {0}" -f $_.Exception.Message
    Write-Output $errorMessage
    exit(1)
}