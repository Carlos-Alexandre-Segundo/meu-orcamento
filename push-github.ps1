param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^https://github\.com/[^/]+/[^/]+(?:\.git)?/?$')]
  [string]$RepoUrl
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) { throw "git falhou: $($GitArgs[0])" }
}
if (-not (Test-Path -LiteralPath '.git')) { Invoke-Git init }
$origin = & git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $origin -ne $RepoUrl) { throw 'O projeto já tem outro origin. Confira o repositório antes de continuar.' }
if ($LASTEXITCODE -ne 0) { Invoke-Git remote add origin $RepoUrl }
Invoke-Git add .
& git diff --cached --quiet
if ($LASTEXITCODE -eq 1) { Invoke-Git commit -m 'feat: orçamento mensal com backup JSON' }
elseif ($LASTEXITCODE -ne 0) { throw 'Não foi possível conferir as alterações.' }
Invoke-Git branch -M main
Invoke-Git push -u origin main
