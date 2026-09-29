$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$assetDirectory = [IO.Path]::GetFullPath((Join-Path $workspace 'assets'))
$manifestPath = Join-Path $workspace 'projects/support-desk/releases/manifest.json'
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.version -ne 1 -or $manifest.assetVersion -notmatch '^v[1-9]\d*$') {
  throw 'Mission manifest requires version 1 and assetVersion vN.'
}

$currentAssets = @($manifest.assets)
$retainedAssets = @($manifest.retainedAssets | Where-Object { $null -ne $_ })
if ($currentAssets.Count -ne 6) { throw 'Expected six current mission archives in the manifest.' }
$allAssets = @($currentAssets) + @($retainedAssets)
if (($allAssets.id | Sort-Object -Unique).Count -ne $allAssets.Count) { throw 'Mission manifest contains duplicate asset IDs.' }
if (($allAssets.path | Sort-Object -Unique).Count -ne $allAssets.Count) { throw 'Mission manifest contains duplicate asset paths.' }

$missionChecks = foreach ($asset in $allAssets) {
  if ($asset.id -notmatch '^m0[1-3]-(starter|reference)-v[1-9]\d*$') { throw "Invalid mission asset ID: $($asset.id)" }
  if ($asset.path -ne "assets/$($asset.id).zip") { throw "Asset path does not match its ID: $($asset.id)" }
  if ($asset.checksum -notmatch '^[a-f0-9]{64}$') { throw "Invalid checksum for $($asset.id)" }
  if ($currentAssets.id -contains $asset.id -and $asset.id -notmatch "-$([regex]::Escape($manifest.assetVersion))$") {
    throw "Current asset does not match manifest assetVersion: $($asset.id)"
  }

  $archivePath = [IO.Path]::GetFullPath((Join-Path $workspace ($asset.path -replace '/', [IO.Path]::DirectorySeparatorChar)))
  $expectedPath = [IO.Path]::GetFullPath((Join-Path $assetDirectory ($asset.id + '.zip')))
  if ($archivePath -ne $expectedPath -or -not (Test-Path -LiteralPath $archivePath -PathType Leaf)) { throw "Missing or unsafe archive path: $($asset.path)" }
  $actualChecksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualChecksum -ne $asset.checksum) { throw "Checksum mismatch for $($asset.id)" }

  $missionZip = [IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    foreach ($entry in $missionZip.Entries) {
      $entryName = $entry.FullName -replace '\\','/'
      $privateEnvironment = $entryName -match '(^|/)\.env[^/]*$' -and $entryName -notmatch '(^|/)\.env\.example$'
      if ($entryName -match '(^/|^[A-Za-z]:|(^|/)\.\.(/|$))' -or $entryName -match '(^|/)(node_modules|generated|dist|test-results|playwright-report)(/|$)' -or $privateEnvironment) {
        throw "Unsafe, private, or generated archive entry: $entryName"
      }
      $stream = $entry.Open()
      try { $stream.CopyTo([IO.Stream]::Null) } finally { $stream.Dispose() }
    }
    foreach ($required in @('README.md','package.json','pnpm-lock.yaml','.env.example','src/App.tsx')) {
      if (-not $missionZip.GetEntry($required)) { throw "Missing $required in $($asset.id)" }
    }
    [PSCustomObject]@{
      archive = [IO.Path]::GetFileName($archivePath)
      assetVersion = ($asset.id -replace '^.*-(v[1-9]\d*)$','$1')
      current = $currentAssets.id -contains $asset.id
      entries = $missionZip.Entries.Count
      bytes = (Get-Item -LiteralPath $archivePath).Length
      checksum = $actualChecksum
      standardZipReader = 'passed'
    }
  } finally { $missionZip.Dispose() }
}

$diskArchives = @(Get-ChildItem -LiteralPath $assetDirectory -Filter 'm0*-*-v*.zip' -File | ForEach-Object { $_.Name })
$manifestArchives = @($allAssets | ForEach-Object { [IO.Path]::GetFileName($_.path) })
$untracked = @($diskArchives | Where-Object { $_ -notin $manifestArchives })
$missing = @($manifestArchives | Where-Object { $_ -notin $diskArchives })
if ($untracked.Count -or $missing.Count) { throw "Archive inventory differs from manifest. Untracked: $($untracked -join ', '); missing: $($missing -join ', ')" }

$missionChecks | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $workspace 'docs/archive-verification.json')
$missionChecks | Format-Table
