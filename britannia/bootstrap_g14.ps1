# Britannia bootstrap for the G14. Paste into PowerShell.
$ErrorActionPreference = 'Stop'
$dev  = 'C:\dev'
$repo = Join-Path $dev 'britannia'

# 1. Create the private repo (skips if it already exists)
gh repo view luedersjason/britannia *> $null
if ($LASTEXITCODE -ne 0) { gh repo create luedersjason/britannia --private --add-readme }
if (-not (Test-Path $repo)) { git clone https://github.com/luedersjason/britannia $repo }

# 2. Pull the design docs from the branch they were written on
$tmp = Join-Path $env:TEMP 'claude-src'
if (-not (Test-Path $tmp)) { git clone --quiet https://github.com/luedersjason/claude $tmp }
git -C $tmp fetch --quiet origin claude/loving-fermi-m1ys10
foreach ($f in 'DESIGN.md','RESEARCH_T2A.md','SCRIPTING.md') {
    git -C $tmp show "origin/claude/loving-fermi-m1ys10:britannia/$f" | Set-Content -Encoding utf8 (Join-Path $repo $f)
}
git -C $repo add -A
git -C $repo commit -m "Add design, T2A research and scripting docs"
git -C $repo push origin HEAD

# 3. UO testbed: ServUO emulator source + data folder for the client files
if (-not (Test-Path "$dev\servuo")) { git clone --depth 1 https://github.com/ServUO/ServUO "$dev\servuo" }
New-Item -ItemType Directory -Force 'G:\My Drive\uo-data' | Out-Null

gh repo view luedersjason/britannia
Write-Host "`nDONE. Repo: https://github.com/luedersjason/britannia"
Write-Host "Next (you): free UO account + client install: https://uo.com/endless-journey/"
