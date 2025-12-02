# Quiz and Admin Routes Test Script
# Tests all endpoints in quizzes and admin/quizzes controllers

$baseUrl = "http://localhost:4000/v1"
$contentType = "application/json"

# Color output functions
function Write-Success { param($message) Write-Host "[PASS] $message" -ForegroundColor Green }
function Write-Error { param($message) Write-Host "[FAIL] $message" -ForegroundColor Red }
function Write-Info { param($message) Write-Host "[TEST] $message" -ForegroundColor Cyan }
function Write-Section { param($message) Write-Host "`n=== $message ===" -ForegroundColor Yellow }

# Test counter
$script:totalTests = 0
$script:passedTests = 0
$script:failedTests = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [int[]]$ExpectedStatus = @(200, 201)
    )
    
    $script:totalTests++
    Write-Info "$Method $Url"
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = $contentType
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params
        
        if ($ExpectedStatus -contains $response.StatusCode) {
            Write-Success "$Name - Status: $($response.StatusCode)"
            $script:passedTests++
            
            # Parse and display response
            if ($response.Content) {
                $json = $response.Content | ConvertFrom-Json
                Write-Host "  Response: $($json | ConvertTo-Json -Compress -Depth 2)" -ForegroundColor Gray
            }
            
            return $response.Content | ConvertFrom-Json
        } else {
            Write-Error "$Name - Unexpected status: $($response.StatusCode)"
            $script:failedTests++
            return $null
        }
    }
    catch {
        Write-Error "$Name - Failed: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "  Status Code: $statusCode" -ForegroundColor Red
            
            # Try to read error response body
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errorBody = $reader.ReadToEnd()
                if ($errorBody) {
                    Write-Host "  Error Details: $errorBody" -ForegroundColor Red
                }
            } catch {}
        }
        $script:failedTests++
        return $null
    }
}

# ============================================
# ADMIN QUIZ ROUTES
# ============================================

Write-Section "ADMIN QUIZ ROUTES"

# 1. Create Quiz
Write-Info "Test 1: Create a new quiz"
$createQuizBody = @{
    title = "JavaScript Fundamentals"
    description = "Test your knowledge of JavaScript basics"
    timeLimit = 1800
    passingScore = 70
    questions = @(
        @{
            text = "What is the output of: typeof null?"
            order = 1
            points = 10
            choices = @(
                @{ text = "object"; order = 1 }
                @{ text = "null"; order = 2 }
                @{ text = "undefined"; order = 3 }
                @{ text = "string"; order = 4 }
            )
            correctChoiceIndexes = @(0)  # First choice is correct
        },
        @{
            text = "Which keyword declares a block-scoped variable?"
            order = 2
            points = 10
            choices = @(
                @{ text = "var"; order = 1 }
                @{ text = "let"; order = 2 }
                @{ text = "const"; order = 3 }
                @{ text = "function"; order = 4 }
            )
            correctChoiceIndexes = @(1, 2)  # let and const are both correct
        }
    )
}

$createdQuiz = Test-Endpoint `
    -Name "Create Quiz" `
    -Method "POST" `
    -Url "$baseUrl/admin/quizzes" `
    -Body $createQuizBody `
    -ExpectedStatus @(201)

$quizId = $null
if ($createdQuiz) {
    $quizId = $createdQuiz.id
    Write-Host "  Created Quiz ID: $quizId" -ForegroundColor Magenta
}

# 2. Update Quiz
if ($quizId) {
    Write-Info "`nTest 2: Update quiz"
    $updateQuizBody = @{
        title = "JavaScript Fundamentals - Updated"
        description = "Updated description for JavaScript basics quiz"
    }
    
    Test-Endpoint `
        -Name "Update Quiz" `
        -Method "PUT" `
        -Url "$baseUrl/admin/quizzes/$quizId" `
        -Body $updateQuizBody `
        -ExpectedStatus @(200)
}

# 3. Publish Quiz
if ($quizId) {
    Write-Info "`nTest 3: Publish quiz"
    Test-Endpoint `
        -Name "Publish Quiz" `
        -Method "POST" `
        -Url "$baseUrl/admin/quizzes/$quizId/publish" `
        -ExpectedStatus @(200)
}

# ============================================
# PUBLIC QUIZ ROUTES
# ============================================

Write-Section "PUBLIC QUIZ ROUTES"

# 4. Get All Published Quizzes
Write-Info "Test 4: Get all published quizzes"
$allQuizzes = Test-Endpoint `
    -Name "Get All Published Quizzes" `
    -Method "GET" `
    -Url "$baseUrl/quizzes" `
    -ExpectedStatus @(200)

if ($allQuizzes) {
    Write-Host "  Total Published Quizzes: $($allQuizzes.Count)" -ForegroundColor Magenta
}

# 5. Get Specific Quiz
if ($quizId) {
    Write-Info "`nTest 5: Get quiz by ID"
    Test-Endpoint `
        -Name "Get Quiz by ID" `
        -Method "GET" `
        -Url "$baseUrl/quizzes/$quizId" `
        -ExpectedStatus @(200)
}

# 6. Get Non-existent Quiz (Error case)
Write-Info "`nTest 6: Get non-existent quiz (should fail)"
Test-Endpoint `
    -Name "Get Non-existent Quiz" `
    -Method "GET" `
    -Url "$baseUrl/quizzes/99999" `
    -ExpectedStatus @(404)

# ============================================
# ADDITIONAL ADMIN TESTS
# ============================================

Write-Section "ADDITIONAL ADMIN TESTS"

# 7. Create Another Quiz
Write-Info "Test 7: Create second quiz"
$quiz2Body = @{
    title = "Python Basics"
    description = "Introduction to Python programming"
    timeLimit = 1200
    passingScore = 60
    questions = @(
        @{
            text = "What is the correct file extension for Python files?"
            order = 1
            points = 5
            choices = @(
                @{ text = ".py"; order = 1 }
                @{ text = ".python"; order = 2 }
                @{ text = ".pt"; order = 3 }
            )
            correctChoiceIndexes = @(0)  # .py is correct
        }
    )
}

$quiz2 = Test-Endpoint `
    -Name "Create Second Quiz" `
    -Method "POST" `
    -Url "$baseUrl/admin/quizzes" `
    -Body $quiz2Body `
    -ExpectedStatus @(201)

# 8. Publish Second Quiz
if ($quiz2) {
    Write-Info "`nTest 8: Publish second quiz"
    Test-Endpoint `
        -Name "Publish Second Quiz" `
        -Method "POST" `
        -Url "$baseUrl/admin/quizzes/$($quiz2.id)/publish" `
        -ExpectedStatus @(200)
}

# 9. Update with Questions
if ($quizId) {
    Write-Info "`nTest 9: Update quiz with new question"
    $updateWithQuestionsBody = @{
        questions = @(
            @{
                text = "What is a closure in JavaScript?"
                order = 3
                points = 15
                choices = @(
                    @{ text = "A function with access to parent scope"; order = 1 }
                    @{ text = "A loop structure"; order = 2 }
                    @{ text = "A variable declaration"; order = 3 }
                )
                correctChoiceIndexes = @(0)  # First choice is correct
            }
        )
    }
    
    Test-Endpoint `
        -Name "Update Quiz with Questions" `
        -Method "PUT" `
        -Url "$baseUrl/admin/quizzes/$quizId" `
        -Body $updateWithQuestionsBody `
        -ExpectedStatus @(200)
}

# ============================================
# TEST SUMMARY
# ============================================

Write-Section "TEST SUMMARY"
Write-Host "Total Tests: $script:totalTests" -ForegroundColor White
Write-Host "Passed: $script:passedTests" -ForegroundColor Green
Write-Host "Failed: $script:failedTests" -ForegroundColor Red

if ($script:failedTests -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed" -ForegroundColor Yellow
    exit 1
}
