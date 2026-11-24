param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Debug', 'Release')][string]$Variant,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9_-]+$')][string]$CaseId,
    [ValidatePattern('^[A-Za-z0-9._:-]+$')][string]$Serial,
    [switch]$Screenshot,
    [string]$Notes = ''
)

$ErrorActionPreference = 'Stop'
$adbExecutable = (Get-Command adb -ErrorAction Stop).Source
$packageName = 'com.titaniumsportgym.app'
if (-not $Serial) {
    $connected = @(& $adbExecutable devices | Select-String '^\S+\s+device$' | ForEach-Object { ($_.Line -split '\s+')[0] })
    if ($connected.Count -ne 1) { throw 'Connect exactly one authorized Android device, or pass -Serial.' }
    $Serial = $connected[0]
}
if ($Serial -notmatch '^[A-Za-z0-9._:-]+$') { throw 'Invalid ADB serial format.' }
function Read-Device([string[]]$Arguments) {
    $result = & $adbExecutable -s $Serial @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'ADB read failed. Check device authorization and serial.' }
    return ($result | Out-String).Trim()
}

# Only read system/application metadata; never clear app data, install, change
# permissions, read SecureStore, capture raw logcat or send backend requests.
$androidVersion = Read-Device -Arguments @('shell', 'getprop', 'ro.build.version.release')
$apiLevel = Read-Device -Arguments @('shell', 'getprop', 'ro.build.version.sdk')
$model = Read-Device -Arguments @('shell', 'getprop', 'ro.product.model')
$packageInfo = Read-Device -Arguments @('shell', 'dumpsys', 'package', $packageName)
if ($packageInfo -notmatch 'versionCode=') { throw 'The Titanium package is not installed.' }
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $deviceHash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Serial)))).Replace('-', '').Substring(0, 12) }
finally { $sha.Dispose() }
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$evidencePath = Join-Path $taskRoot ('coverage\security\android\{0}-{1}-{2}' -f $CaseId, $Variant, (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $evidencePath -Force | Out-Null

if ($Screenshot) {
    # Stream binary output directly; PowerShell 5 text redirection corrupts PNG.
    # Use only synthetic accounts and remove unrelated notifications first.
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $adbExecutable
    $processInfo.Arguments = '-s "{0}" exec-out screencap -p' -f $Serial
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $processInfo.RedirectStandardOutput = $true
    $process = [Diagnostics.Process]::Start($processInfo)
    $png = [IO.File]::Create((Join-Path $evidencePath 'screen.png'))
    try {
        $process.StandardOutput.BaseStream.CopyTo($png)
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw 'Screenshot capture failed.' }
    } finally { $png.Dispose(); $process.Dispose() }
}

$metadata = [ordered]@{
    capturedAtUtc = [DateTime]::UtcNow.ToString('o')
    deviceIdHash = $deviceHash
    model = $model
    androidVersion = $androidVersion
    apiLevel = $apiLevel
    package = $packageName
    variantDeclaredByTester = $Variant
    variantVerifiedByScript = $false
    versionCode = [regex]::Match($packageInfo, 'versionCode=(\d+)').Groups[1].Value
    versionName = [regex]::Match($packageInfo, 'versionName=([^\s]+)').Groups[1].Value
    caseId = $CaseId
    result = 'PENDING_MANUAL_VERIFICATION'
    notes = $Notes
    screenshotCaptured = [bool]$Screenshot
}
$metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $evidencePath 'evidence.json') -Encoding utf8
Write-Output ('Evidence saved locally: {0}. Case remains pending manual verification.' -f $evidencePath)
