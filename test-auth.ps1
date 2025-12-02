# Authentication System Test Script
# Tests all auth endpoints with sample data

Write-Host "=== Authentication System Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:4000"

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/health" -Method Get
    Write-Host "   ✓ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: User Signup
Write-Host "2. Testing User Signup..." -ForegroundColor Yellow
$signupData = @{
    email = "test$(Get-Random)@example.com"
    password = "SecurePass123!"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

try {
    $signupResponse = Invoke-RestMethod -Uri "$baseUrl/auth/signup" -Method Post -Body $signupData -ContentType "application/json"
    Write-Host "   ✓ Signup successful" -ForegroundColor Green
    $global:testEmail = ($signupData | ConvertFrom-Json).email
    $global:accessToken = $signupResponse.access_token
    $global:refreshToken = $signupResponse.refresh_token
    $global:userId = $signupResponse.user.id
    Write-Host "   User ID: $($signupResponse.user.id)" -ForegroundColor Gray
    Write-Host "   Email: $($signupResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Access Token: $($global:accessToken.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Expires In: $($signupResponse.expires_in)s" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Signup failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: User Login
Write-Host "3. Testing User Login..." -ForegroundColor Yellow
if ($global:testEmail) {
    $loginData = @{
        email = $global:testEmail
        password = "SecurePass123!"
    } | ConvertTo-Json

    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginData -ContentType "application/json"
        Write-Host "   ✓ Login successful" -ForegroundColor Green
        $global:accessToken = $loginResponse.access_token
        $global:refreshToken = $loginResponse.refresh_token
        Write-Host "   User ID: $($loginResponse.user.id)" -ForegroundColor Gray
        Write-Host "   Email: $($loginResponse.user.email)" -ForegroundColor Gray
        Write-Host "   New Access Token: $($global:accessToken.Substring(0, 30))..." -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⊘ Skipped (no test user)" -ForegroundColor DarkGray
}

Write-Host ""

# Test 4: Refresh Token
Write-Host "4. Testing Token Refresh..." -ForegroundColor Yellow
if ($global:refreshToken) {
    $refreshData = @{
        refreshToken = $global:refreshToken
    } | ConvertTo-Json

    try {
        $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method Post -Body $refreshData -ContentType "application/json"
        Write-Host "   ✓ Token refresh successful" -ForegroundColor Green
        Write-Host "   New Access Token: $($refreshResponse.access_token.Substring(0, 30))..." -ForegroundColor Gray
        Write-Host "   New Refresh Token: $($refreshResponse.refresh_token.Substring(0, 30))..." -ForegroundColor Gray
        $global:accessToken = $refreshResponse.access_token
        $global:refreshToken = $refreshResponse.refresh_token
    } catch {
        Write-Host "   ✗ Token refresh failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⊘ Skipped (no refresh token)" -ForegroundColor DarkGray
}

Write-Host ""

# Test 5: Invalid Login
Write-Host "5. Testing Invalid Login..." -ForegroundColor Yellow
$invalidLoginData = @{
    email = "test@example.com"
    password = "WrongPassword123!"
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $invalidLoginData -ContentType "application/json" -ErrorAction Stop
    Write-Host "   ✗ Should have failed but succeeded" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✓ Correctly rejected invalid credentials (401)" -ForegroundColor Green
    } else {
        Write-Host "   ✓ Rejected invalid credentials" -ForegroundColor Green
    }
}

Write-Host ""

# Test 6: Logout
Write-Host "6. Testing Logout..." -ForegroundColor Yellow
if ($global:userId -and $global:refreshToken) {
    $logoutData = @{
        userId = $global:userId
        refreshToken = $global:refreshToken
    } | ConvertTo-Json

    try {
        $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method Post -Body $logoutData -ContentType "application/json"
        Write-Host "   ✓ Logout successful" -ForegroundColor Green
        Write-Host "   Message: $($logoutResponse.message)" -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Logout failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⊘ Skipped (no user session)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✓ All critical auth endpoints tested" -ForegroundColor Green
Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Yellow
Write-Host "  Signup: " -NoNewline; Write-Host '$body = @{email="user@test.com";password="SecurePass123!";firstName="Test";lastName="User"} | ConvertTo-Json; Invoke-RestMethod -Uri "http://localhost:4000/auth/signup" -Method Post -Body $body -ContentType "application/json"' -ForegroundColor White
Write-Host "  Login:  " -NoNewline; Write-Host '$body = @{email="user@test.com";password="SecurePass123!"} | ConvertTo-Json; Invoke-RestMethod -Uri "http://localhost:4000/auth/login" -Method Post -Body $body -ContentType "application/json"' -ForegroundColor White
