using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult> Login([FromBody] LoginRequest request)
    {
        var (user, token) = await _authService.LoginAsync(request.Email, request.Password);
        if (user == null || token == null)
            return Unauthorized(new { message = "Invalid email or password" });

        return Ok(new LoginResponse
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id!,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role.ToString()
            }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var user = await _authService.GetUserByIdAsync(userId);
        if (user == null) return Unauthorized();

        return Ok(new UserDto
        {
            Id = user.Id!,
            Email = user.Email,
            Name = user.Name,
            Role = user.Role.ToString()
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var success = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
        if (!success) return BadRequest(new { message = "Current password is incorrect" });

        return Ok(new { message = "Password changed successfully" });
    }

    [HttpPost("request-reset")]
    [AllowAnonymous]
    public async Task<ActionResult> RequestPasswordReset([FromBody] RequestResetRequest request)
    {
        // Always return OK to not leak whether email exists
        await _authService.RequestPasswordResetAsync(request.Email);
        return Ok(new { message = "If an admin account exists with this email, a reset code has been sent." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var success = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!success) return BadRequest(new { message = "Invalid or expired reset token" });

        return Ok(new { message = "Password reset successfully. You can now log in." });
    }

    // --- Admin: User Management ---

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> GetAllUsers()
    {
        var users = await _authService.GetAllUsersAsync();
        var dtos = users.Select(u => new UserDto
        {
            Id = u.Id!,
            Email = u.Email,
            Name = u.Name,
            Role = u.Role.ToString(),
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt
        }).ToList();
        return Ok(dtos);
    }

    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var role = request.Role?.ToLower() == "admin" ? UserRole.Admin : UserRole.User;
        var user = await _authService.CreateUserAsync(request.Email, request.Name, request.Password, role);
        if (user == null) return BadRequest(new { message = "A user with this email already exists" });

        return Ok(new UserDto
        {
            Id = user.Id!,
            Email = user.Email,
            Name = user.Name,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpDelete("users/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteUser(string id)
    {
        var success = await _authService.DeleteUserAsync(id);
        if (!success) return BadRequest(new { message = "Cannot delete this user. Admin accounts cannot be removed." });
        return Ok(new { message = "User deleted" });
    }

    [HttpPatch("users/{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> ToggleUserActive(string id)
    {
        var success = await _authService.ToggleUserActiveAsync(id);
        if (!success) return BadRequest(new { message = "Cannot modify this user" });
        return Ok(new { message = "User status updated" });
    }
}

// Request/Response DTOs
public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = new();
}

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Role { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class RequestResetRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
