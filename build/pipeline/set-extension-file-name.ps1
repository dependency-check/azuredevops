Try {
    $generatedFileName = $env:GENERATED_FILE_NAME
    $regex = [regex] '(?i)(.+)\.gen(?:\d+)?(\.vsix)'
    $extensionFileName = $regex.Replace($generatedFileName, '$1$2')
    Rename-Item -Path $generatedFileName -NewName $extensionFileName
    Write-Host "##vso[task.setvariable variable=ExtensionFileName]$extensionFileName"
} catch {
    $errorMessage = "Error on set extension file name: {0}" -f $_.Exception.Message
    Write-Output $errorMessage
    exit(1)
}