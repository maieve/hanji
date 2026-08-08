$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

$tokenPath = Join-Path $PSScriptRoot '..\.sync-token'
if (-not (Test-Path -LiteralPath $tokenPath)) { throw '.sync-token 파일이 필요합니다.' }
$syncToken = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
$base = 'https://hanji-sync.chaekgalpi.workers.dev'
$source = [Text.Encoding]::UTF8.GetBytes('hanji cloud live verification')
$sha = [Security.Cryptography.SHA256]::Create()
$expectedHash = ([BitConverter]::ToString($sha.ComputeHash($source))).Replace('-', '')
$client = [Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $syncToken)

function Assert-Response($response, $step) {
  if (-not $response.IsSuccessStatusCode) {
    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    throw "$step failed ($([int]$response.StatusCode)): $body"
  }
}

function Assert-Download($name) {
  $response = $client.GetAsync("$base/v1/backups/$name").GetAwaiter().GetResult()
  Assert-Response $response 'GET'
  $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $actual = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '')
  if ($actual -ne $expectedHash) { throw "SHA-256 mismatch for $name" }
}

function Verify-SinglePut {
  $name = "hanji-e2e-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).hanji"
  $uploaded = $false
  try {
    $content = [Net.Http.ByteArrayContent]::new($source)
    $content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::new('application/zip')
    $response = $client.PutAsync("$base/v1/backups/$name", $content).GetAwaiter().GetResult()
    Assert-Response $response 'PUT'; $uploaded = $true
    Assert-Download $name
  } finally {
    if ($uploaded) { Assert-Response ($client.DeleteAsync("$base/v1/backups/$name").GetAwaiter().GetResult()) 'DELETE' }
  }
}

function Verify-Multipart {
  $name = "hanji-e2e-multipart-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).hanji"
  $completed = $false
  try {
    $start = $client.PostAsync("$base/v1/multipart/start/$name", $null).GetAwaiter().GetResult()
    Assert-Response $start 'MULTIPART START'
    $started = $start.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
    $uploadId = [uri]::EscapeDataString($started.uploadId)
    $part = $client.PutAsync("$base/v1/multipart/part/$name/$uploadId/1", [Net.Http.ByteArrayContent]::new($source)).GetAwaiter().GetResult()
    Assert-Response $part 'MULTIPART PART'
    $partInfo = $part.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
    $body = @{parts = @(@{partNumber = 1; etag = $partInfo.etag})} | ConvertTo-Json -Depth 4 -Compress
    $content = [Net.Http.StringContent]::new($body, [Text.Encoding]::UTF8, 'application/json')
    $complete = $client.PostAsync("$base/v1/multipart/complete/$name/$uploadId", $content).GetAwaiter().GetResult()
    Assert-Response $complete 'MULTIPART COMPLETE'; $completed = $true
    Assert-Download $name
  } finally {
    if ($completed) { Assert-Response ($client.DeleteAsync("$base/v1/backups/$name").GetAwaiter().GetResult()) 'DELETE' }
  }
}

try {
  $health = $client.GetStringAsync("$base/health").GetAwaiter().GetResult() | ConvertFrom-Json
  if (-not $health.ok) { throw 'health check failed' }
  Verify-SinglePut
  Verify-Multipart
  $objects = ($client.GetStringAsync("$base/v1/backups").GetAwaiter().GetResult() | ConvertFrom-Json).objects
  if (@($objects | Where-Object name -like 'hanji-e2e-*').Count -ne 0) { throw 'test object cleanup failed' }
  Write-Output "Cloudflare live verification passed (health, PUT, multipart, SHA-256, cleanup)."
} finally {
  $client.Dispose()
  $sha.Dispose()
  Remove-Variable syncToken
}
