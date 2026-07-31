# process_dataset.ps1
# Automated Respiratory Sound Dataset Processing & Balancing Script

# Configuration
$TargetSamplesPerClass = 200
$OutputDir = Join-Path $PSScriptRoot "structured_dataset"

Write-Host "====================================================================="
Write-Host "Starting automated dataset processing..."
Write-Host "Target samples per class: $TargetSamplesPerClass"
Write-Host "Output directory: $OutputDir"
Write-Host "====================================================================="
Write-Host

# 1. Helper function to parse WAV headers from stream
function Get-WavDurationAndMetadata($stream, $fileLength) {
    $reader = [System.IO.BinaryReader]::new($stream)
    try {
        $riff = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4))
        if ($riff -ne "RIFF") { return $null }
        $fileLen = $reader.ReadUInt32()
        $wave = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4))
        if ($wave -ne "WAVE") { return $null }
        
        $sampleRate = 0
        $channels = 0
        $byteRate = 0
        $bitsPerSample = 0
        $dataSize = 0
        
        $bytesRead = 12
        while ($bytesRead -lt $fileLength -and $bytesRead -lt 4000) {
            $chunkIdBytes = $reader.ReadBytes(4)
            if ($chunkIdBytes.Length -lt 4) { break }
            $chunkId = [System.Text.Encoding]::ASCII.GetString($chunkIdBytes)
            $chunkSize = $reader.ReadUInt32()
            $bytesRead += 8
            
            if ($chunkId -eq "fmt ") {
                $audioFormat = $reader.ReadUInt16()
                $channels = $reader.ReadUInt16()
                $sampleRate = $reader.ReadUInt32()
                $byteRate = $reader.ReadUInt32()
                $blockAlign = $reader.ReadUInt16()
                $bitsPerSample = $reader.ReadUInt16()
                
                if ($chunkSize -gt 16) {
                    $null = $reader.ReadBytes($chunkSize - 16)
                }
            } elseif ($chunkId -eq "data") {
                $dataSize = $chunkSize
                break
            } else {
                $null = $reader.ReadBytes($chunkSize)
            }
            $bytesRead += $chunkSize
            if ($chunkSize % 2 -ne 0) {
                $null = $reader.ReadByte()
                $bytesRead += 1
            }
        }
        
        if ($sampleRate -gt 0 -and $byteRate -gt 0 -and $dataSize -gt 0) {
            $duration = $dataSize / $byteRate
            return @{
                SampleRate = $sampleRate
                Channels = $channels
                BitsPerSample = $bitsPerSample
                Duration = $duration
                DataSize = $dataSize
            }
        }
    } catch {
        # Silent fail for unreadable headers
    }
    return $null
}

# 2. Load Patient Mappings for ICBHI (Ascowh.zip)
$diag = @{}
$diagFile = Join-Path $PSScriptRoot "test_diagnosis.csv"
if (-not (Test-Path $diagFile)) {
    Write-Host "Patient diagnosis file not found. Downloading raw patient_diagnosis.csv..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/architgajpal/respiratory_disease_classification/master/patient_diagnosis.csv" -OutFile $diagFile
}
Import-Csv -Path $diagFile | ForEach-Object { $diag[$_.ID] = $_.CLASS }

$allFiles = @()

# 3. Scan Ascowh.zip
Write-Host "Scanning Ascowh.zip (ICBHI dataset)..." -ForegroundColor Yellow
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip1 = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'Ascowh.zip'))
$wavs1 = $zip1.Entries | Where-Object { $_.FullName -like '*.wav' }

$scanned1 = 0
foreach ($w in $wavs1) {
    $name = [System.IO.Path]::GetFileName($w.FullName)
    $patientId = $name.Split('_')[0]
    $class = $diag[$patientId]
    
    $targetClass = $null
    if ($class -eq "Healthy") { $targetClass = "Normal" }
    elseif ($class -eq "Asthma") { $targetClass = "Asthma" }
    elseif ($class -eq "COPD") { $targetClass = "COPD" }
    elseif ($class -eq "Pneumonia") { $targetClass = "Pneumonia" }
    
    # Process header only if it matches a target class
    if ($targetClass) {
        $stream = $w.Open()
        $wavMeta = Get-WavDurationAndMetadata $stream $w.Length
        $stream.Dispose()
        
        if ($wavMeta) {
            $allFiles += [PSCustomObject]@{
                Filename = $name
                OutputFilename = $name
                ZipPath = $w.FullName
                SourceZip = "Ascowh.zip"
                Class = $targetClass
                Duration = $wavMeta.Duration
                SampleRate = $wavMeta.SampleRate
                Channels = $wavMeta.Channels
                BitsPerSample = $wavMeta.BitsPerSample
            }
        } else {
            Write-Warning "Corrupted or invalid WAV file in Ascowh.zip: $($w.FullName)"
        }
    }
    $scanned1++
    if ($scanned1 % 200 -eq 0) {
        Write-Host "  Scanned $scanned1 / $($wavs1.Count) files..."
    }
}
$zip1.Dispose()
Write-Host "Completed scanning Ascowh.zip. Found $($allFiles.Count) target files." -ForegroundColor Green
Write-Host

# 4. Scan coronary.zip
Write-Host "Scanning coronary.zip (CoronaHack dataset)..." -ForegroundColor Yellow
$zip2 = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'coronary.zip'))

$metaEntry = $zip2.Entries | Where-Object { $_.FullName -like '*Corona-Hack-Respiratory-Sound-Metadata.csv' }
if (-not $metaEntry) {
    $zip2.Dispose()
    Throw "Corona-Hack-Respiratory-Sound-Metadata.csv not found in coronary.zip"
}
$stream = $metaEntry.Open()
$reader = [System.IO.StreamReader]::new($stream)
$headerLine = $reader.ReadLine()
$headers = $headerLine.Split(',')
$userIdIdx = [Array]::IndexOf($headers, "USER_ID")
$covidStatusIdx = [Array]::IndexOf($headers, "COVID_STATUS")
$asthmaIdx = [Array]::IndexOf($headers, "Asthma")
$cldIdx = [Array]::IndexOf($headers, "Chronic_Lung_Disease")
$pneumIdx = [Array]::IndexOf($headers, "Pneumonia")

$coronaMeta = @{}
while (($line = $reader.ReadLine()) -ne $null) {
    $fields = $line.Split(',')
    if ($fields.Count -gt $covidStatusIdx) {
        $uid = $fields[$userIdIdx]
        $coronaMeta[$uid] = @{
            COVID_STATUS = $fields[$covidStatusIdx]
            Asthma = $fields[$asthmaIdx]
            Chronic_Lung_Disease = $fields[$cldIdx]
            Pneumonia = $fields[$pneumIdx]
        }
    }
}
$reader.Dispose()
$stream.Dispose()

$wavs2 = $zip2.Entries | Where-Object { $_.FullName -like '*.wav' }
$scanned2 = 0
$matched2 = 0

foreach ($w in $wavs2) {
    $parts = $w.FullName -split '/'
    if ($parts.Count -lt 2) { continue }
    $uid = $parts[$parts.Count - 2]
    $name = $parts[$parts.Count - 1]
    
    $meta = $coronaMeta[$uid]
    if ($meta) {
        $targetClass = $null
        
        if ($meta.COVID_STATUS -like "*positive*" -or $meta.COVID_STATUS -eq "recovered_full") {
            $targetClass = "Post_COVID"
        } elseif ($meta.Asthma -eq "1") {
            $targetClass = "Asthma"
        } elseif ($meta.Pneumonia -eq "1") {
            $targetClass = "Pneumonia"
        } elseif ($meta.Chronic_Lung_Disease -eq "1") {
            $targetClass = "COPD"
        } elseif ($meta.COVID_STATUS -eq "healthy" -and $meta.Asthma -ne "1" -and $meta.Pneumonia -ne "1" -and $meta.Chronic_Lung_Disease -ne "1") {
            $targetClass = "Normal"
        }
        
        if ($targetClass) {
            $stream = $w.Open()
            $wavMeta = Get-WavDurationAndMetadata $stream $w.Length
            $stream.Dispose()
            
            if ($wavMeta) {
                $allFiles += [PSCustomObject]@{
                    Filename = $name
                    OutputFilename = "$uid`_$name"
                    ZipPath = $w.FullName
                    SourceZip = "coronary.zip"
                    Class = $targetClass
                    Duration = $wavMeta.Duration
                    SampleRate = $wavMeta.SampleRate
                    Channels = $wavMeta.Channels
                    BitsPerSample = $wavMeta.BitsPerSample
                }
                $matched2++
            } else {
                Write-Warning "Corrupted or invalid WAV file in coronary.zip: $($w.FullName)"
            }
        }
    }
    $scanned2++
    if ($scanned2 % 2000 -eq 0) {
        Write-Host "  Scanned $scanned2 / $($wavs2.Count) files..."
    }
}
$zip2.Dispose()
Write-Host "Completed scanning coronary.zip. Found $matched2 target files." -ForegroundColor Green
Write-Host

# 5. Group and Balance Dataset
Write-Host "Balancing dataset to target $TargetSamplesPerClass samples per class..." -ForegroundColor Yellow
$grouped = $allFiles | Group-Object -Property Class

$balancedFiles = @()
$uniqueExtracted = @{}

$classes = @("Normal", "Asthma", "COPD", "Pneumonia", "Post_COVID")

foreach ($c in $classes) {
    $grp = $grouped | Where-Object { $_.Name -eq $c }
    $classFiles = if ($grp) { $grp.Group } else { @() }
    $count = $classFiles.Count
    
    Write-Host "  Class: $c | Raw count: $count"
    
    if ($count -eq 0) {
        Write-Warning "    No samples found for class $c!"
        continue
    }
    
    $selected = @()
    if ($count -ge $TargetSamplesPerClass) {
        # Undersample without replacement
        $selected = $classFiles | Get-Random -Count $TargetSamplesPerClass
        Write-Host "    Undersampled to $TargetSamplesPerClass" -ForegroundColor Cyan
    } else {
        # Oversample with replacement
        $selected += $classFiles
        $needed = $TargetSamplesPerClass - $count
        if ($needed -gt 0) {
            for ($i = 0; $i -lt $needed; $i++) {
                $selected += ($classFiles | Get-Random)
            }
        }
        Write-Host "    Oversampled to $TargetSamplesPerClass" -ForegroundColor Cyan
    }
    
    $index = 0
    foreach ($f in $selected) {
        $uniqueKey = "$($f.SourceZip):$($f.ZipPath)"
        $isDuplicate = $false
        
        if ($uniqueExtracted.Contains($uniqueKey)) {
            $isDuplicate = $true
        } else {
            $uniqueExtracted[$uniqueKey] = @{
                SourceZip = $f.SourceZip
                ZipPath = $f.ZipPath
                Filename = $f.Filename
                OutputFilename = $f.OutputFilename
                Class = $f.Class
                Duration = $f.Duration
                SampleRate = $f.SampleRate
                Channels = $f.Channels
                BitsPerSample = $f.BitsPerSample
            }
        }
        
        $balancedFiles += [PSCustomObject]@{
            Filename = $f.Filename
            OutputFilename = $f.OutputFilename
            Class = $f.Class
            Duration = $f.Duration
            SampleRate = $f.SampleRate
            Channels = $f.Channels
            BitsPerSample = $f.BitsPerSample
            SourceZip = $f.SourceZip
            ZipPath = $f.ZipPath
            IsDuplicate = $isDuplicate
            BalancedIndex = $index
        }
        $index++
    }
}
Write-Host "Dataset balanced successfully." -ForegroundColor Green
Write-Host

# 6. Extract Selected Unique Files
Write-Host "Re-initializing structured output directory..." -ForegroundColor Yellow
if (Test-Path $OutputDir) {
    Remove-Item -Path $OutputDir -Recurse -Force
}
New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null

foreach ($c in $classes) {
    New-Item -Path (Join-Path $OutputDir $c) -ItemType Directory -Force | Out-Null
}

Write-Host "Extracting unique files to structured folders (this may take a few moments)..." -ForegroundColor Yellow
$zip1 = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'Ascowh.zip'))
$zip2 = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'coronary.zip'))

$extractedCount = 0
foreach ($key in $uniqueExtracted.Keys) {
    $info = $uniqueExtracted[$key]
    $sourceZip = $info.SourceZip
    $zipPath = $info.ZipPath
    $outputFilename = $info.OutputFilename
    $class = $info.Class
    
    $targetPath = Join-Path $OutputDir (Join-Path $class $outputFilename)
    
    $entry = $null
    if ($sourceZip -eq "Ascowh.zip") {
        $entry = $zip1.GetEntry($zipPath)
    } else {
        $entry = $zip2.GetEntry($zipPath)
    }
    
    if ($entry) {
        $stream = $entry.Open()
        $outStream = [System.IO.File]::Create($targetPath)
        $stream.CopyTo($outStream)
        $outStream.Close()
        $stream.Close()
        $extractedCount++
    }
}
$zip1.Dispose()
$zip2.Dispose()
Write-Host "Successfully extracted $extractedCount unique WAV files." -ForegroundColor Green
Write-Host

# 7. Export CSV Metadata
Write-Host "Exporting CSV metadata..." -ForegroundColor Yellow
$uniqueMetadata = $uniqueExtracted.Values | ForEach-Object {
    [PSCustomObject]@{
        OutputFilename = $_.OutputFilename
        OriginalFilename = $_.Filename
        Class = $_.Class
        DurationSeconds = $_.Duration
        SampleRate = $_.SampleRate
        Channels = $_.Channels
        BitsPerSample = $_.BitsPerSample
        SourceZip = $_.SourceZip
        ZipPath = $_.ZipPath
    }
}
$uniqueMetadata | Export-Csv -Path (Join-Path $OutputDir "metadata.csv") -NoTypeInformation

$balancedExport = $balancedFiles | ForEach-Object {
    [PSCustomObject]@{
        OutputFilename = $_.OutputFilename
        Class = $_.Class
        DurationSeconds = $_.Duration
        SampleRate = $_.SampleRate
        Channels = $_.Channels
        BitsPerSample = $_.BitsPerSample
        IsDuplicate = $_.IsDuplicate
        BalancedIndex = $_.BalancedIndex
    }
}
$balancedExport | Export-Csv -Path (Join-Path $OutputDir "train_balanced.csv") -NoTypeInformation
Write-Host "CSV metadata files written successfully." -ForegroundColor Green
Write-Host

# 8. Compute Statistics and Write Summary Report
Write-Host "Generating report..." -ForegroundColor Yellow
$rawStats = $allFiles | Group-Object -Property Class
$balancedStats = $balancedFiles | Group-Object -Property Class

function Get-DurationStats($group) {
    if (-not $group -or $group.Count -eq 0) {
        return @{ Min = 0; Max = 0; Mean = 0; Total = 0 }
    }
    $durations = $group | ForEach-Object { $_.Duration }
    $measure = $durations | Measure-Object -Min -Max -Average -Sum
    return @{
        Min = $measure.Minimum
        Max = $measure.Maximum
        Mean = $measure.Average
        Total = $measure.Sum
    }
}

$report = New-Object System.Text.StringBuilder
[void]$report.AppendLine("=====================================================================")
[void]$report.AppendLine("                     RESPIRATORY SOUND DATASET SUMMARY               ")
[void]$report.AppendLine("=====================================================================")
[void]$report.AppendLine("Generated On: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$report.AppendLine("Target Samples Per Class: $TargetSamplesPerClass")
[void]$report.AppendLine()
[void]$report.AppendLine("---------------------------------------------------------------------")
[void]$report.AppendLine("1. CLASS DISTRIBUTION AND DURATIONS")
[void]$report.AppendLine("---------------------------------------------------------------------")
[void]$report.AppendLine(([string]::Format("{0,-15} | {1,-10} | {2,-15} | {3,-15} | {4,-15} | {5,-15}", "Class", "Raw Count", "Balanced Count", "Total Dur (s)", "Mean Dur (s)", "Min/Max Dur (s)")))
[void]$report.AppendLine("---------------------------------------------------------------------")

$minRawCount = 999999
$maxRawCount = 0

foreach ($c in $classes) {
    $rawGrp = $rawStats | Where-Object { $_.Name -eq $c }
    $balGrp = $balancedStats | Where-Object { $_.Name -eq $c }
    
    $rawCount = if ($rawGrp) { $rawGrp.Count } else { 0 }
    $balCount = if ($balGrp) { $balGrp.Count } else { 0 }
    
    if ($rawCount -gt 0) {
        if ($rawCount -lt $minRawCount) { $minRawCount = $rawCount }
        if ($rawCount -gt $maxRawCount) { $maxRawCount = $rawCount }
    }
    
    $stats = Get-DurationStats $balGrp.Group
    
    [void]$report.AppendLine(([string]::Format("{0,-15} | {1,-10} | {2,-15} | {3,-15:F2} | {4,-15:F2} | {5:F2}/{6:F2}", 
        $c, $rawCount, $balCount, $stats.Total, $stats.Mean, $stats.Min, $stats.Max)))
}

[void]$report.AppendLine("---------------------------------------------------------------------")
[void]$report.AppendLine()

$rawImbalance = if ($minRawCount -gt 0) { $maxRawCount / $minRawCount } else { 0 }

[void]$report.AppendLine("---------------------------------------------------------------------")
[void]$report.AppendLine("2. DATASET IMBALANCE RATIO")
[void]$report.AppendLine("---------------------------------------------------------------------")
[void]$report.AppendLine("Raw Imbalance Ratio (Majority/Minority): $([string]::Format('{0:F2}', $rawImbalance))")
[void]$report.AppendLine("Balanced Imbalance Ratio:                1.00")
[void]$report.AppendLine()
[void]$report.AppendLine("---------------------------------------------------------------------")
[void]$report.AppendLine("3. DATASET SOURCE DETAILS")
[void]$report.AppendLine("---------------------------------------------------------------------")

$rawSources = $allFiles | Group-Object -Property SourceZip
foreach ($s in $rawSources) {
    [void]$report.AppendLine("$($s.Name): $($s.Count) files matched")
}

$summaryText = $report.ToString()
Write-Output $summaryText
$summaryText | Out-File -FilePath (Join-Path $OutputDir "dataset_summary.txt") -Encoding utf8

Write-Host
Write-Host "====================================================================="
Write-Host "Dataset processing and structuring completed successfully!"
Write-Host "Summary report saved to: $(Join-Path $OutputDir 'dataset_summary.txt')"
Write-Host "====================================================================="
