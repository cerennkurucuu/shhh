#Requires -Version 5.1
<#
Run from the PowerShell session containing GH_TOKEN. Never stores credentials.
Part 2: creates only SHHH-025 through SHHH-048; reuses all eight existing Epics.
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
$ReportPath = Join-Path $DraftRoot 'part2-result.json'
$Utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$ProgressLog = New-Object 'System.Collections.Generic.List[string]'
$Drafts = New-Object 'System.Collections.Generic.List[object]'
$Map = @{}
$ExpectedBodies = @{}
$AllDrafts = New-Object 'System.Collections.Generic.List[object]'
$Dependencies = @{}
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
        completedOperations = @($ProgressLog.ToArray()); issues = $entries; dependencyGraph = $Dependencies
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
    # Native stderr is captured in memory; raw diagnostics are never written to disk.
    if ($null -ne $Payload) {
        [IO.File]::WriteAllText($payloadPath, ($Payload | ConvertTo-Json -Depth 12 -Compress), $Utf8)
        $argsList += @('--input', $payloadPath)
    }
    # Capture stderr without printing raw diagnostic/credential output.
    $savedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $raw = @(& $script:GhPath @argsList 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedPreference
    }
    if ($exitCode -ne 0) {
        $detail = ($raw | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
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
    $marker = '<!-- shhh-part2:' + $Draft.Code + ':start -->'
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
    foreach ($target in $AllDrafts) {
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
    $start = '<!-- shhh-part2:' + $Code + ':start -->'
    $end = '<!-- shhh-part2:' + $Code + ':end -->'
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

# Standalone helper functions are prepended during local preparation.
function Read-Draft([string]$Code) {
    $text = [IO.File]::ReadAllText((Join-Path $DraftRoot ($Code + '.md')), $Utf8).TrimStart([char]0xFEFF)
    $titleMatch = [regex]::Match($text, '(?m)^# (.+)\r?$')
    $labelMatch = [regex]::Match($text, '(?m)^Labels: (.+)\r?$')
    if (-not $titleMatch.Success -or -not $labelMatch.Success) { throw "Invalid draft: $Code" }
    $title = $titleMatch.Groups[1].Value.Trim()
    if ($title -notmatch ('^' + $Code + '(?![A-Za-z0-9-])')) { throw "Draft title/code mismatch: $Code" }
    $labels = @([regex]::Matches($labelMatch.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value })
    if ($labels.Count -ne 4) { throw "Expected four labels: $Code" }
    foreach ($label in $labels) { if ($RequiredLabels -notcontains $label) { throw "Unknown label: $label" } }
    $body = $text.Substring($labelMatch.Index + $labelMatch.Length).Trim()
    if ($Code -like 'SHHH-*') {
        foreach ($n in 1..8) {
            if ($body -notmatch ('(?m)^## ' + $n + '\. .+')) { throw "Missing section $n in $Code" }
        }
        if ($body -notmatch '(?m)^- \[ \] ' -or $body -notmatch 'Pozitif:' -or $body -notmatch 'Negatif') {
            throw "Missing acceptance/test content: $Code"
        }
    }
    return [pscustomobject]@{ Code = $Code; Title = $title; Body = $body; Labels = $labels }
}

function Get-Dependencies([string]$Body, [string]$Code) {
    $section = [regex]::Match($Body, '(?ms)^## 6\. [^\r\n]+\r?\n(.*?)(?=^## 7\. )')
    if (-not $section.Success) { throw "Missing dependency section: $Code" }
    return @([regex]::Matches($section.Groups[1].Value, '\bSHHH-\d{3}\b') |
        ForEach-Object { $_.Value } | Sort-Object -Unique)
}

function Visit-Dependency([string]$Code, [hashtable]$Graph, [hashtable]$States) {
    if ($States.ContainsKey($Code)) {
        if ($States[$Code] -eq 1) { throw "Dependency cycle at $Code" }
        return
    }
    $States[$Code] = 1
    foreach ($dep in $Graph[$Code]) {
        if (-not $Graph.ContainsKey($dep)) { throw "Unknown dependency $dep from $Code" }
        Visit-Dependency $dep $Graph $States
    }
    $States[$Code] = 2
}

function Assert-Graph([hashtable]$Graph) {
    if ($Graph.Count -ne 48) { throw 'Expected 48 dependency nodes.' }
    $states = @{}
    foreach ($code in @($Graph.Keys | Sort-Object)) { Visit-Dependency $code $Graph $states }
}

function Assert-Part1Map($Report, [object[]]$Existing) {
    if ($Report.repository -cne $Repo -or $Report.status -ne 'verified' -or @($Report.issues).Count -ne 32) {
        throw 'Part 1 report is not a verified 32-issue report for this repository.'
    }
    $seen = @{}
    foreach ($entry in $Report.issues) {
        if ($OldCodes -notcontains $entry.code -or $seen.ContainsKey($entry.code)) { throw 'Invalid/duplicate code in part 1 report.' }
        $seen[$entry.code] = $true
        $draft = $DraftByCode[$entry.code]
        $found = Find-Issue $draft $Existing
        if ($null -eq $found) { throw "Missing prerequisite issue: $($entry.code); run/reconcile part 1 first." }
        if ($found.number -ne $entry.number -or $found.html_url -cne $entry.url -or $found.html_url -cne ($WebRoot + '/issues/' + $found.number)) {
            throw "Part 1 report/server identity mismatch: $($entry.code)"
        }
        $Map[$entry.code] = $found
    }
}

function Assert-ServerDependencies($Draft, $Issue) {
    $actual = @(Get-Dependencies ([string]$Issue.body) $Draft.Code)
    if (($actual -join ',') -cne (@($Dependencies[$Draft.Code]) -join ',')) {
        throw "Server/local dependency mismatch for $($Draft.Code); refusing to rewrite upstream requirements."
    }
}

function Render-EpicLinks([string]$Code) {
    $epicNumber = [int]$Code.Substring(5)
    $first = 25 + (($epicNumber - 4) * 6)
    $body = "## Part 2 child issues`n`nThe six child issues below replace the part 1 placeholder. Technical requirements remain in the existing Epic description.`n"
    foreach ($n in $first..($first + 5)) {
        $childCode = 'SHHH-{0:D3}' -f $n
        $body += "`n- [ ] [$childCode](https://github.com/$Repo/issues/$($Map[$childCode].number))"
    }
    return $body
}

function Merge-EpicBody([string]$Existing, [string]$Code) {
    $content = Render-EpicLinks $Code
    $marker = '<!-- shhh-part2:' + $Code + ':start -->'
    if ($Existing.Contains($marker)) { return Merge-ManagedBody $Existing $content $Code }
    # Replace only the exact known placeholder; preserve human additions and
    # all original acceptance/scope text. Otherwise append a managed block.
    $original = $DraftByCode[$Code].Body
    $section = [regex]::Match($original, '(?ms)^## Alt [^\r\n]+\r?\n(.*?)(?=^## |\z)')
    if ($section.Success) {
        $placeholder = $section.Groups[1].Value.Trim()
        if ($placeholder.Length -gt 0 -and $Existing.Contains($placeholder)) {
            $occurrences = [regex]::Matches($Existing, [regex]::Escape($placeholder)).Count
            if ($occurrences -ne 1) { throw "Ambiguous Epic placeholder in $Code" }
            $block = Merge-ManagedBody '' $content $Code
            return $Existing.Replace($placeholder, $block)
        }
    }
    return Merge-ManagedBody $Existing $content $Code
}

try {
    $gh = Get-Command gh -CommandType Application -ErrorAction Stop
    $script:GhPath = $gh.Source
    if ([string]::IsNullOrWhiteSpace($env:GH_TOKEN)) { throw 'GH_TOKEN is absent. Use the already authorized PowerShell session.' }
    $env:GH_DEBUG = $null
    $env:GH_PROMPT_DISABLED = '1'
    $env:GH_BROWSER = 'false'
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $OutputEncoding = [Console]::OutputEncoding
    # Same checkout lock as part 1: never run both automations concurrently.
    $Lock = [IO.File]::Open((Join-Path $DraftRoot 'part1.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $Work = Join-Path ([IO.Path]::GetTempPath()) ('shhh-part2-' + [Guid]::NewGuid().ToString('N'))
    [void][IO.Directory]::CreateDirectory($Work)
    $script:DocNames = @('01-PROJECT-OVERVIEW.md','02-PRD.md','03-SOFTWARE-ARCHITECTURE.md',
        '04-LOCAL-DATA-AND-PRIVACY.md','05-UI-DESIGN-SYSTEM.md','06-NAVIGATION-AND-SCREEN-FLOW.md',
        '07-CODING-STANDARDS.md','08-TEST-PLAN.md','09-SOURCES-AND-LICENSES.md')
    foreach ($path in @('README.md') + @($DocNames | ForEach-Object { 'docs/' + $_ })) {
        if ([string]::IsNullOrWhiteSpace([IO.File]::ReadAllText((Join-Path $Root $path), $Utf8))) { throw "Empty document: $path" }
    }
    $RequiredLabels = @('type:epic','type:documentation','type:research','type:feature','type:security',
        'type:test','type:release','priority:P0','priority:P1','priority:P2','phase:00-discovery',
        'phase:01-pwa','phase:02-audio','phase:03-ai','phase:04-session','phase:05-ui',
        'phase:06-security','phase:07-release','status:blocked','status:ready')
    $OldCodes = @(0..7 | ForEach-Object { 'EPIC-{0:D2}' -f $_ }) + @(1..24 | ForEach-Object { 'SHHH-{0:D3}' -f $_ })
    $NewCodes = @(25..48 | ForEach-Object { 'SHHH-{0:D3}' -f $_ })
    $AllCodes = @($OldCodes) + @($NewCodes)
    $DraftByCode = @{}
    foreach ($code in $AllCodes) {
        $draft = Read-Draft $code
        $AllDrafts.Add($draft)
        $DraftByCode[$code] = $draft
        if ($NewCodes -contains $code) { $Drafts.Add($draft) }
        if ($code -like 'SHHH-*') { $Dependencies[$code] = @(Get-Dependencies $draft.Body $code) }
    }
    Assert-Graph $Dependencies
    foreach ($draft in $AllDrafts) {
        foreach ($m in [regex]::Matches($draft.Body, '\]\(([^)]+)\)')) {
            $link = $m.Groups[1].Value
            if ($link -match '^(EPIC-\d{2}|SHHH-\d{3})\.md$') {
                if ($AllCodes -notcontains $link.Substring(0, $link.Length - 3)) { throw "Out-of-plan reference: $link" }
            } elseif ($link -match '^\.\./\.\./docs/([^/]+\.md)$') {
                if ($DocNames -notcontains $Matches[1]) { throw "Unknown document link: $link" }
            } elseif ($link -notmatch '^https://') { throw "Unsupported draft link: $link" }
        }
    }
    foreach ($draft in $Drafts) {
        $n = [int]$draft.Code.Substring(5)
        $parent = 'EPIC-{0:D2}' -f (4 + [int][Math]::Floor(($n - 25) / 6))
        if (-not $draft.Body.Contains(('Parent: [' + $parent + '](' + $parent + '.md)'))) { throw "Wrong parent: $($draft.Code)" }
    }
    $part1 = [IO.File]::ReadAllText((Join-Path $DraftRoot 'part1-result.json'), $Utf8) | ConvertFrom-Json
    # All local input and graph checks precede the first network mutation.
    $Operation = 'verify repository identity and upstream server issues'
    $repository = Invoke-GhJson 'GET' $ApiRoot
    if ($repository.full_name -cne $Repo -or $repository.archived -or -not $repository.has_issues) { throw 'Repository verification failed.' }
    $existing = @(Get-All 'issues')
    Assert-Part1Map $part1 $existing
    foreach ($code in @($OldCodes | Where-Object { $_ -like 'SHHH-*' })) {
        Assert-ServerDependencies $DraftByCode[$code] $Map[$code]
    }
    foreach ($draft in $Drafts) {
        $found = Find-Issue $draft $existing
        if ($null -ne $found) { $Map[$draft.Code] = $found }
    }
    Complete-Step ('Preflight verified all part 1 mappings and acyclic 48-node dependency graph; known issues: ' + $Map.Count)

    $Operation = 'ensure required labels'
    $labels = @(Get-All 'labels')
    foreach ($label in $RequiredLabels) {
        if (@($labels | Where-Object { $_.name -eq $label }).Count -eq 0) {
            $Operation = 'create label ' + $label
            $null = Invoke-GhJson 'POST' ($ApiRoot + '/labels') @{name=$label; color='5319E7'; description='shhh. planning'}
            Complete-Step ('Created label ' + $label)
        }
    }
    foreach ($draft in $Drafts) {
        if ($Map.ContainsKey($draft.Code)) { continue }
        $Operation = 'recheck before create ' + $draft.Code
        $found = Find-Issue $draft @(Get-All 'issues')
        if ($null -ne $found) { $Map[$draft.Code] = $found; continue }
        $Operation = 'create ' + $draft.Code + ' (interrupted POST outcome may be unknown; rerun reconciles)'
        Save-Report 'in-progress'
        $body = Merge-ManagedBody '' (Render-Body $draft $false) $draft.Code
        $issue = Invoke-GhJson 'POST' ($ApiRoot + '/issues') @{title=$draft.Title; body=$body; labels=@($draft.Labels)}
        if ($issue.html_url -cne ($WebRoot + '/issues/' + $issue.number)) { throw 'Unexpected server issue URL.' }
        $Map[$draft.Code] = $issue
        Complete-Step ("Created $($draft.Code) #$($issue.number) $($issue.html_url)")
    }
    foreach ($draft in $Drafts) {
        $Operation = 'link and label ' + $draft.Code
        $number = $Map[$draft.Code].number
        $fresh = Invoke-GhJson 'GET' ($ApiRoot + '/issues/' + $number)
        if ($null -eq (Find-Issue $draft @($fresh))) { throw 'Issue identity changed.' }
        $desired = Merge-ManagedBody ([string]$fresh.body) (Render-Body $draft $true) $draft.Code
        if ([string]$fresh.body -cne $desired) { $fresh = Invoke-GhJson 'PATCH' ($ApiRoot + '/issues/' + $number) @{body=$desired} }
        $currentLabels = @($fresh.labels | ForEach-Object { $_.name })
        $missing = @($draft.Labels | Where-Object { $currentLabels -notcontains $_ })
        if ($missing.Count) { $null = Invoke-GhJson 'POST' ($ApiRoot + '/issues/' + $number + '/labels') @{labels=$missing} }
        $ExpectedBodies[$draft.Code] = $desired
        Complete-Step ("Linked/checked $($draft.Code) #$number")
    }
    foreach ($n in 4..7) {
        $code = 'EPIC-{0:D2}' -f $n
        $Operation = 'update child links in ' + $code
        $number = $Map[$code].number
        $fresh = Invoke-GhJson 'GET' ($ApiRoot + '/issues/' + $number)
        if ($null -eq (Find-Issue $DraftByCode[$code] @($fresh))) { throw 'Epic identity changed.' }
        $desired = Merge-EpicBody ([string]$fresh.body) $code
        if ([string]$fresh.body -cne $desired) { $null = Invoke-GhJson 'PATCH' ($ApiRoot + '/issues/' + $number) @{body=$desired} }
        $ExpectedBodies[$code] = $desired
        Complete-Step ("Updated Epic child links $code #$number")
    }
    $Operation = 'final verification of 8 OPEN Epics and 48 OPEN child issues'
    $verified = @(Get-All 'issues')
    $serverGraph = @{}
    foreach ($draft in $AllDrafts) {
        $issue = Find-Issue $draft $verified
        if ($null -eq $issue -or $issue.number -ne $Map[$draft.Code].number -or $issue.html_url -cne ($WebRoot + '/issues/' + $issue.number)) {
            throw "Missing/mismatched issue: $($draft.Code)"
        }
        if ($ExpectedBodies.ContainsKey($draft.Code) -and [string]$issue.body -cne $ExpectedBodies[$draft.Code]) { throw "Body verification failed: $($draft.Code)" }
        foreach ($label in $draft.Labels) {
            if (@($issue.labels | ForEach-Object { $_.name }) -notcontains $label) { throw "Missing issue label: $($draft.Code) $label" }
        }
        if ($draft.Code -like 'SHHH-*') {
            Assert-ServerDependencies $draft $issue
            $serverGraph[$draft.Code] = @(Get-Dependencies $issue.body $draft.Code)
        }
        $Map[$draft.Code] = $issue
    }
    Assert-Graph $serverGraph
    # Verify every new dependency link and both directions of each parent link.
    foreach ($draft in $Drafts) {
        $issue = $Map[$draft.Code]
        foreach ($dep in $Dependencies[$draft.Code]) {
            if (-not $issue.body.Contains(('https://github.com/' + $Repo + '/issues/' + $Map[$dep].number + ')'))) { throw "Unlinked dependency: $($draft.Code) -> $dep" }
        }
        $n = [int]$draft.Code.Substring(5)
        $parent = 'EPIC-{0:D2}' -f (4 + [int][Math]::Floor(($n - 25) / 6))
        $parentLink = '[' + $parent + '](' + $WebRoot + '/issues/' + $Map[$parent].number + ')'
        $childLink = '[' + $draft.Code + '](' + $WebRoot + '/issues/' + $issue.number + ')'
        if (-not $issue.body.Contains($parentLink) -or -not $Map[$parent].body.Contains($childLink)) { throw 'Bidirectional Epic link verification failed.' }
        if ($issue.body -match '\]\((EPIC-\d{2}|SHHH-\d{3})\.md\)') { throw 'Unresolved issue link.' }
    }
    if ($Map.Count -ne 56 -or @($Map.Values | Select-Object -ExpandProperty number -Unique).Count -ne 56) { throw 'Expected exactly 56 distinct planned OPEN issues.' }
    Complete-Step 'Verified 8 OPEN Epics + 48 OPEN child issues, bidirectional Epic links and all 48 dependency nodes.'
    Save-Report 'verified'
    foreach ($code in $AllCodes) { Write-Host ("{0} -> #{1} {2}" -f $code, $Map[$code].number, $Map[$code].html_url) }
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
