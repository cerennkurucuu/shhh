#Requires -Version 5.1
<#
Run from the PowerShell session containing GH_TOKEN. Never stores credentials.
Reads planning/issues/*.md; preserves README, docs and source drafts.
Only GitHub operations: read repository/issues/labels, create labels/issues,
patch managed issue-body blocks and add labels. No state changes or git writes.
Partial/ambiguous failures stop immediately; rerun discovers server-side results.
Uses bidirectional Markdown Epic links (no native sub-issue mutation required).
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Repo = 'cerennkurucuu/shhh'
$ApiRoot = 'repos/' + $Repo
$WebRoot = 'https://github.com/' + $Repo
$Root = Split-Path -Parent $PSScriptRoot
$DraftRoot = Join-Path $Root 'planning\issues'
$ReportPath = Join-Path $DraftRoot 'part1-result.json'
$Utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$ProgressLog = New-Object 'System.Collections.Generic.List[string]'
$Drafts = New-Object 'System.Collections.Generic.List[object]'
$Map = @{}
$ExpectedBodies = @{}
$Operation = 'local preflight'
$Lock = $null
$Work = $null
$Failed = $false
$OldDebug = $env:GH_DEBUG
$OldPrompt = $env:GH_PROMPT_DISABLED
$OldBrowser = $env:GH_BROWSER
$OldConsoleEncoding = [Console]::OutputEncoding
$OldPipelineEncoding = $OutputEncoding

function Protect-Message([string]$Message) {
    if (-not [string]::IsNullOrEmpty($env:GH_TOKEN)) {
        $Message = $Message.Replace($env:GH_TOKEN, '[REDACTED]')
    }
    return [regex]::Replace($Message, '(?i)(github_pat_|gh[pousr]_)[A-Za-z0-9_]+', '[REDACTED]')
}

function Save-Report([string]$Status, [string]$ErrorText = '') {
    $entries = @($Map.Keys | Sort-Object | ForEach-Object {
        [ordered]@{ code = $_; number = $Map[$_].number; url = $Map[$_].html_url }
    })
    $report = [ordered]@{
        repository = $Repo; status = $Status; updatedUtc = [DateTime]::UtcNow.ToString('o')
        currentOperation = $Operation; error = (Protect-Message $ErrorText)
        completedOperations = @($ProgressLog.ToArray()); issues = $entries
    }
    $json = $report | ConvertTo-Json -Depth 8
    [IO.File]::WriteAllText($ReportPath, $json, $Utf8)
}

function Complete-Step([string]$Message) {
    $ProgressLog.Add($Message)
    Write-Host $Message
    Save-Report 'in-progress'
}

function Invoke-GhJson([string]$Method, [string]$Endpoint, $Payload = $null) {
    # Endpoints cannot escape the one allowed repository or host.
    if ($Endpoint -notmatch ('^' + [regex]::Escape($ApiRoot) + '($|/|\?)')) {
        throw 'Refusing endpoint outside the fixed repository.'
    }
    $argsList = @('api', '--hostname', 'github.com', '--method', $Method,
        '-H', 'Accept: application/vnd.github+json',
        '-H', 'X-GitHub-Api-Version: 2022-11-28', $Endpoint)
    $payloadPath = Join-Path $Work 'payload.json'
    $errorPath = Join-Path $Work 'stderr.txt'
    if ($null -ne $Payload) {
        [IO.File]::WriteAllText($payloadPath, ($Payload | ConvertTo-Json -Depth 12 -Compress), $Utf8)
        $argsList += @('--input', $payloadPath)
    }
    # Capture stderr without printing raw diagnostic/credential output.
    $savedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $raw = @(& $script:GhPath @argsList 2> $errorPath)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedPreference
    }
    if ($exitCode -ne 0) {
        $detail = [IO.File]::ReadAllText($errorPath)
        throw (Protect-Message ("gh API failed ($Method $Endpoint), exit ${exitCode}: $detail"))
    }
    $text = $raw -join "`n"
    if ([string]::IsNullOrWhiteSpace($text)) { throw "Empty API response: $Endpoint" }
    return ($text | ConvertFrom-Json)
}

function Get-All([string]$Resource) {
    $results = New-Object 'System.Collections.Generic.List[object]'
    for ($page = 1; ; $page++) {
        $query = '?per_page=100&page=' + $page
        if ($Resource -eq 'issues') { $query += '&state=all&sort=created&direction=asc' }
        $items = @(Invoke-GhJson 'GET' ($ApiRoot + '/' + $Resource + $query))
        foreach ($item in $items) {
            if ($Resource -eq 'issues' -and $null -ne $item.PSObject.Properties['pull_request']) { continue }
            $results.Add($item)
        }
        if ($items.Count -lt 100) { break }
    }
    return $results.ToArray()
}

function Find-Issue($Draft, [object[]]$Issues) {
    $pattern = '^' + [regex]::Escape($Draft.Code) + '(?![A-Za-z0-9-])'
    $marker = '<!-- shhh-part1:' + $Draft.Code + ':start -->'
    $matchesFound = @($Issues | Where-Object {
        $_.title -match $pattern -or ([string]$_.body).Contains($marker)
    })
    if ($matchesFound.Count -gt 1) { throw "Duplicate server issues for $($Draft.Code); no automatic merge/delete." }
    if ($matchesFound.Count -eq 1) {
        if ($matchesFound[0].title -notmatch $pattern) { throw "Marker/title conflict for $($Draft.Code)." }
        if ($matchesFound[0].state -ne 'open') { throw "$($Draft.Code) is closed; script will not reopen or duplicate it." }
        return $matchesFound[0]
    }
    return $null
}

function Render-Body($Draft, [bool]$Final) {
    $body = $Draft.Body
    foreach ($name in $script:DocNames) {
        $body = $body.Replace('../../docs/' + $name, $WebRoot + '/blob/main/docs/' + $name)
    }
    foreach ($target in $Drafts) {
        $link = '[' + $target.Code + '](' + $target.Code + '.md)'
        $replacement = $target.Code
        if ($Map.ContainsKey($target.Code)) {
            $replacement = '[' + $target.Code + '](https://github.com/' + $Repo + '/issues/' + $Map[$target.Code].number + ')'
        }
        $body = $body.Replace($link, $replacement)
    }
    if ($Final) {
        $refs = @([regex]::Matches($Draft.Body, '\b(?:EPIC-\d{2}|SHHH-\d{3})\b') |
            ForEach-Object { $_.Value } | Sort-Object -Unique |
            Where-Object { $_ -ne $Draft.Code -and $Map.ContainsKey($_) })
        if ($refs.Count -gt 0) {
            $body += "`n`n## GitHub Issue references`n"
            foreach ($ref in $refs) {
                $body += "`n- [$ref](https://github.com/$Repo/issues/$($Map[$ref].number))"
            }
        }
    }
    $body += "`n`nDocumentation links refer to local prepared documents; they become available on GitHub only after a separately authorized push. No code or documents are pushed by this script."
    return $body.Trim()
}

function Merge-ManagedBody([string]$Existing, [string]$Content, [string]$Code) {
    $start = '<!-- shhh-part1:' + $Code + ':start -->'
    $end = '<!-- shhh-part1:' + $Code + ':end -->'
    $block = $start + "`n" + $Content + "`n" + $end
    $starts = [regex]::Matches($Existing, [regex]::Escape($start))
    $ends = [regex]::Matches($Existing, [regex]::Escape($end))
    if ($starts.Count -eq 0 -and $ends.Count -eq 0) {
        if ([string]::IsNullOrWhiteSpace($Existing)) { return $block }
        # Preserve all pre-existing human content outside the managed block.
        return $Existing.TrimEnd() + "`n`n" + $block
    }
    if ($starts.Count -ne 1 -or $ends.Count -ne 1 -or $starts[0].Index -ge $ends[0].Index) {
        throw "Malformed managed block in $Code; refusing to overwrite."
    }
    $length = $ends[0].Index + $end.Length - $starts[0].Index
    return $Existing.Substring(0, $starts[0].Index) + $block + $Existing.Substring($starts[0].Index + $length)
}

try {
    $gh = Get-Command gh -CommandType Application -ErrorAction Stop
    $script:GhPath = $gh.Source
    if ([string]::IsNullOrWhiteSpace($env:GH_TOKEN)) { throw 'GH_TOKEN is absent. Run in the already authorized PowerShell session.' }
    $env:GH_DEBUG = $null
    $env:GH_PROMPT_DISABLED = '1'
    $env:GH_BROWSER = 'false'
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $OutputEncoding = [Console]::OutputEncoding
    # Local exclusive lock prevents simultaneous runs from this checkout.
    $lockPath = Join-Path $DraftRoot 'part1.lock'
    $Lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $Work = Join-Path ([IO.Path]::GetTempPath()) ('shhh-part1-' + [Guid]::NewGuid().ToString('N'))
    [void][IO.Directory]::CreateDirectory($Work)

    $script:DocNames = @('01-PROJECT-OVERVIEW.md','02-PRD.md','03-SOFTWARE-ARCHITECTURE.md',
        '04-LOCAL-DATA-AND-PRIVACY.md','05-UI-DESIGN-SYSTEM.md','06-NAVIGATION-AND-SCREEN-FLOW.md',
        '07-CODING-STANDARDS.md','08-TEST-PLAN.md','09-SOURCES-AND-LICENSES.md')
    foreach ($path in @('README.md') + @($DocNames | ForEach-Object { 'docs/' + $_ })) {
        $text = [IO.File]::ReadAllText((Join-Path $Root $path), $Utf8)
        if ([string]::IsNullOrWhiteSpace($text)) { throw "Empty document: $path" }
    }
    $codes = @(0..7 | ForEach-Object { 'EPIC-{0:D2}' -f $_ }) + @(1..24 | ForEach-Object { 'SHHH-{0:D3}' -f $_ })
    $requiredLabels = @('type:epic','type:documentation','type:research','type:feature','type:security',
        'type:test','type:release','priority:P0','priority:P1','priority:P2','phase:00-discovery',
        'phase:01-pwa','phase:02-audio','phase:03-ai','phase:04-session','phase:05-ui',
        'phase:06-security','phase:07-release','status:blocked','status:ready')
    foreach ($code in $codes) {
        $text = [IO.File]::ReadAllText((Join-Path $DraftRoot ($code + '.md')), $Utf8).TrimStart([char]0xFEFF)
        $titleMatch = [regex]::Match($text, '(?m)^# (.+)\r?$')
        $labelMatch = [regex]::Match($text, '(?m)^Labels: (.+)\r?$')
        if (-not $titleMatch.Success -or -not $labelMatch.Success) { throw "Invalid draft: $code" }
        $title = $titleMatch.Groups[1].Value.Trim()
        if ($title -notmatch ('^' + $code + '(?![A-Za-z0-9-])')) { throw "Draft code/title mismatch: $code" }
        $labels = @([regex]::Matches($labelMatch.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value })
        if ($labels.Count -ne 4) { throw "Expected four draft labels: $code" }
        foreach ($label in $labels) { if ($requiredLabels -notcontains $label) { throw "Unknown label: $label" } }
        $offset = $labelMatch.Index + $labelMatch.Length
        $body = $text.Substring($offset).Trim()
        if ($code -like 'SHHH-*') {
            foreach ($section in 1..8) {
                if ($body -notmatch ('(?m)^## ' + $section + '\. .+')) { throw "Missing section $section in $code" }
            }
            if ($body -notmatch '(?m)^- \[ \] ' -or $body -notmatch 'Pozitif:' -or $body -notmatch 'Negatif') {
                throw "Missing acceptance/test content: $code"
            }
        } elseif (@([regex]::Matches($body, '(?m)^## ')).Count -lt 5 -or $body -notmatch '- \[ \]') {
            throw "Incomplete Epic: $code"
        }
        $Drafts.Add([pscustomobject]@{ Code = $code; Title = $title; Body = $body; Labels = $labels })
    }
    # Preflight all local references before the first network mutation.
    foreach ($draft in $Drafts) {
        foreach ($match in [regex]::Matches($draft.Body, '\]\(([^)]+)\)')) {
            $target = $match.Groups[1].Value
            if ($target -match '^(EPIC-\d{2}|SHHH-\d{3})\.md$') {
                if ($codes -notcontains $target.Substring(0, $target.Length - 3)) { throw "Out-of-plan link: $target" }
            } elseif ($target -notmatch '^https://' -and $target -notmatch '^\.\./\.\./docs/[^/]+\.md$') {
                throw "Unexpected draft link: $target"
            }
        }
    }

    $Operation = 'verify repository and authentication via gh API'
    $repository = Invoke-GhJson 'GET' $ApiRoot
    if ($repository.full_name -cne $Repo -or $repository.archived -or -not $repository.has_issues) {
        throw 'Repository identity/availability check failed.'
    }
    $Operation = 'read all existing issues, including closed'
    $existing = @(Get-All 'issues')
    foreach ($draft in $Drafts) {
        $found = Find-Issue $draft $existing
        if ($null -ne $found) { $Map[$draft.Code] = $found }
    }
    Complete-Step ("Preflight complete; existing planned issues: " + $Map.Count)

    $Operation = 'ensure required labels'
    $serverLabels = @(Get-All 'labels')
    foreach ($label in $requiredLabels) {
        if (@($serverLabels | Where-Object { $_.name -eq $label }).Count -eq 0) {
            $Operation = 'create label ' + $label
            $color = '5319E7'
            if ($label -like 'priority:*') { $color = 'B60205' }
            elseif ($label -like 'phase:*') { $color = '1D76DB' }
            elseif ($label -like 'status:*') { $color = 'FBCA04' }
            $null = Invoke-GhJson 'POST' ($ApiRoot + '/labels') @{ name = $label; color = $color; description = 'shhh. part 1 planning' }
            Complete-Step ('Created label ' + $label)
        }
    }
    foreach ($draft in $Drafts) {
        if ($Map.ContainsKey($draft.Code)) { continue }
        # Fresh authoritative list immediately before every create. Never retry a POST.
        $Operation = 'check before create ' + $draft.Code
        $found = Find-Issue $draft @(Get-All 'issues')
        if ($null -ne $found) { $Map[$draft.Code] = $found; continue }
        $Operation = 'create ' + $draft.Code + ' (if interrupted, outcome may be unknown; rerun to reconcile)'
        Save-Report 'in-progress'
        $content = Merge-ManagedBody '' (Render-Body $draft $false) $draft.Code
        $issue = Invoke-GhJson 'POST' ($ApiRoot + '/issues') @{ title = $draft.Title; body = $content; labels = @($draft.Labels) }
        if ($issue.html_url -ne ($WebRoot + '/issues/' + $issue.number)) { throw 'Unexpected issue URL in server response.' }
        $Map[$draft.Code] = $issue
        Complete-Step ("Created $($draft.Code) #$($issue.number) $($issue.html_url)")
    }
    # All real numbers now exist: reconcile body blocks and additive labels.
    foreach ($draft in $Drafts) {
        $number = $Map[$draft.Code].number
        $Operation = 'link and label ' + $draft.Code
        $fresh = Invoke-GhJson 'GET' ($ApiRoot + '/issues/' + $number)
        $confirmed = Find-Issue $draft @($fresh)
        if ($null -eq $confirmed) { throw "Issue identity changed during run: $($draft.Code)" }
        $desired = Merge-ManagedBody ([string]$fresh.body) (Render-Body $draft $true) $draft.Code
        if ([string]$fresh.body -cne $desired) {
            $fresh = Invoke-GhJson 'PATCH' ($ApiRoot + '/issues/' + $number) @{ body = $desired }
        }
        $missingLabels = @($draft.Labels | Where-Object { @($fresh.labels | ForEach-Object { $_.name }) -notcontains $_ })
        if ($missingLabels.Count -gt 0) {
            $null = Invoke-GhJson 'POST' ($ApiRoot + '/issues/' + $number + '/labels') @{ labels = $missingLabels }
        }
        $ExpectedBodies[$draft.Code] = $desired
        Complete-Step ("Linked/checked $($draft.Code) #$number")
    }

    $Operation = 'final server-side verification'
    $verified = @(Get-All 'issues')
    $verifiedLabels = @(Get-All 'labels')
    foreach ($label in $requiredLabels) {
        if (@($verifiedLabels | Where-Object { $_.name -eq $label }).Count -ne 1) { throw "Label verification failed: $label" }
    }
    foreach ($draft in $Drafts) {
        $issue = Find-Issue $draft $verified
        if ($null -eq $issue -or $issue.number -ne $Map[$draft.Code].number) { throw "Missing/mismatched issue: $($draft.Code)" }
        if ([string]$issue.body -cne $ExpectedBodies[$draft.Code]) { throw "Body verification failed: $($draft.Code)" }
        foreach ($label in $draft.Labels) {
            if (@($issue.labels | ForEach-Object { $_.name }) -notcontains $label) { throw "Issue label verification failed: $($draft.Code) $label" }
        }
        if ($issue.body -match '\]\((?:EPIC-\d{2}|SHHH-\d{3})\.md\)') { throw 'Unresolved issue link.' }
        $Map[$draft.Code] = $issue
    }
    if ($Map.Count -ne 32) { throw 'Expected exactly 32 planned OPEN issues.' }
    Complete-Step 'Verified 8 OPEN Epics + 24 OPEN child issues and all required labels.'
    Save-Report 'verified'
    foreach ($code in $codes) { Write-Host ("{0} -> #{1} {2}" -f $code, $Map[$code].number, $Map[$code].html_url) }
    Write-Host ('Report: ' + $ReportPath)
} catch {
    $Failed = $true
    $safeError = Protect-Message $_.Exception.Message
    Write-Host ('STOPPED at: ' + $Operation) -ForegroundColor Red
    Write-Host $safeError -ForegroundColor Red
    Write-Host ('Completed operations this run: ' + $ProgressLog.Count + '; known issue mappings: ' + $Map.Count)
    Write-Host 'No rollback/deletion is attempted. An interrupted POST may have succeeded; rerun reconciles all server issues before creating anything.'
    foreach ($entry in $ProgressLog) { Write-Host ('  ' + $entry) }
    # Do not overwrite another running instance's report if the lock was not acquired.
    if ($null -ne $Lock) {
        try { Save-Report 'failed' $safeError } catch { Write-Host 'Could not save report; use the progress messages above.' }
    }
} finally {
    if ($null -ne $Work -and [IO.Directory]::Exists($Work)) {
        # Only fixed known temporary files, never a recursive computed-path delete.
        foreach ($name in @('payload.json','stderr.txt')) {
            $file = Join-Path $Work $name
            if ([IO.File]::Exists($file)) { [IO.File]::Delete($file) }
        }
        [IO.Directory]::Delete($Work, $false)
    }
    if ($null -ne $Lock) { $Lock.Dispose() }
    $env:GH_DEBUG = $OldDebug
    $env:GH_PROMPT_DISABLED = $OldPrompt
    $env:GH_BROWSER = $OldBrowser
    [Console]::OutputEncoding = $OldConsoleEncoding
    $OutputEncoding = $OldPipelineEncoding
}
if ($Failed) { exit 1 }
