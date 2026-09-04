param(
  [string]$RootPath = $PSScriptRoot,
  [int]$Port = 5502
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Serving $RootPath at http://127.0.0.1:$Port/"

$mimeMap = @{
  ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript";
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  try {
    $relPath = $request.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrEmpty($relPath)) { $relPath = "index.html" }
    $filePath = Join-Path $RootPath $relPath
    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      $contentType = $mimeMap[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      # Force the browser to always fetch fresh files during local testing, so
      # edits are never masked by a stale cached copy of the HTML/CSS/JS.
      $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
      $response.Headers.Add("Pragma", "no-cache")
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
  } catch {
    $response.StatusCode = 500
  } finally {
    $response.OutputStream.Close()
  }
}
