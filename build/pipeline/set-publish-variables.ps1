Try {
    $branch = $env:BUILD_SOURCE_BRANCH
    $branchName = $env:BUILD_SOURCE_BRANCH_NAME

    Write-Host "Branch: $branch"
    Write-Host "Branch name: $branchName"

    if (-Not $branchName -imatch '\A[0-9]+\.[0-9]+\.[0-9]+\z') {
        throw "The branch name must respect the version number [0-9]+.[0-9]+.[0-9]+"
    }

    if ($branch -match "refs/tags/.*") {
        # MAIN  (Version from tag name)
        $flow = "main"
        $extensionTag = ""
        $extensionNameSuffix = ""
        $extensionVisibility = "public"
    }
    elseif ($branch -match "refs/heads/feature/.*") {
        # FEAUTURE BRANCHES (Version from branch name)
        $flow = "feature"
        $extensionTag = "-dev"
        $extensionNameSuffix = " - DEV"
        $extensionVisibility = "private"
    }
    elseif ($branch -match "refs/heads/hotfix/.*") {
        # HOTFIXES (Version from branch name)
        $flow = "hotfix"
        $extensionTag = "-hotfix"
        $extensionNameSuffix = " - HOTFIX"
        $extensionVisibility = "private"
    }
    else {
        throw "Branch not match configured build capabilities"
    }

    Write-Host "Flow: $flow"
    Write-Host "Extension Tag: $extensionTag"
    Write-Host "Extension Name Suffix: $extensionNameSuffix"
    Write-Host "Extension Visibility: $extensionVisibility"

    Write-Host "##vso[task.setvariable variable=Publish.flow]$($flow)"
    Write-Host "##vso[task.setvariable variable=Publish.version]$($branchName)"
    Write-Host "##vso[task.setvariable variable=Publish.extensionTag]$($extensionTag)"
    Write-Host "##vso[task.setvariable variable=Publish.extensionNameSuffix]$($extensionNameSuffix)"
    Write-Host "##vso[task.setvariable variable=Publish.extensionVisibility]$($extensionVisibility)"
} catch {
    $errorMessage = "Error on set publish variables: {0}" -f $_.Exception.Message
    Write-Output $errorMessage
    exit(1)
}