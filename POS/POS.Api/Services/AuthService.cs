using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class AuthService
{
    private readonly IMongoCollection<User> _users;
    private readonly JwtSettings _jwtSettings;
    private readonly EmailService _emailService;
    private readonly AppSettings _appSettings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IOptions<MongoDbSettings> dbSettings,
        IOptions<JwtSettings> jwtSettings,
        IOptions<AppSettings> appSettings,
        EmailService emailService,
        ILogger<AuthService> logger)
    {
        var client = new MongoClient(dbSettings.Value.ConnectionString);
        var database = client.GetDatabase(dbSettings.Value.DatabaseName);
        _users = database.GetCollection<User>("users");
        _jwtSettings = jwtSettings.Value;
        _emailService = emailService;
        _appSettings = appSettings.Value;
        _logger = logger;

        // Create unique index on email
        var indexKeys = Builders<User>.IndexKeys.Ascending(u => u.Email);
        var indexOptions = new CreateIndexOptions { Unique = true };
        _users.Indexes.CreateOne(new CreateIndexModel<User>(indexKeys, indexOptions));
    }

    public async Task SeedAdminAsync(string email, string password)
    {
        var existing = await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
        if (existing != null) return;

        var admin = new User
        {
            Email = email,
            Name = "Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = UserRole.Admin,
            IsActive = true
        };
        await _users.InsertOneAsync(admin);
        _logger.LogInformation("Admin user seeded: {Email}", email);
    }

    public async Task<(User? user, string? token)> LoginAsync(string email, string password)
    {
        var user = await _users.Find(u => u.Email == email.ToLower().Trim()).FirstOrDefaultAsync();
        if (user == null || !user.IsActive) return (null, null);

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) return (null, null);

        // Update last login
        var update = Builders<User>.Update.Set(u => u.LastLoginAt, DateTime.UtcNow);
        await _users.UpdateOneAsync(u => u.Id == user.Id, update);

        var token = GenerateJwtToken(user);
        return (user, token);
    }

    public string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id!),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_jwtSettings.ExpiryHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // --- User CRUD (Admin only) ---

    public async Task<List<User>> GetAllUsersAsync() =>
        await _users.Find(_ => true).SortByDescending(u => u.CreatedAt).ToListAsync();

    public async Task<User?> GetUserByIdAsync(string id) =>
        await _users.Find(u => u.Id == id).FirstOrDefaultAsync();

    public async Task<User?> GetUserByEmailAsync(string email) =>
        await _users.Find(u => u.Email == email.ToLower().Trim()).FirstOrDefaultAsync();

    public async Task<User?> CreateUserAsync(string email, string name, string password, UserRole role)
    {
        var existing = await GetUserByEmailAsync(email);
        if (existing != null) return null; // duplicate

        var user = new User
        {
            Email = email.ToLower().Trim(),
            Name = name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            IsActive = true
        };
        await _users.InsertOneAsync(user);
        _logger.LogInformation("User created: {Email} ({Role})", email, role);
        return user;
    }

    public async Task<bool> DeleteUserAsync(string id)
    {
        var user = await GetUserByIdAsync(id);
        if (user == null) return false;
        if (user.Role == UserRole.Admin) return false; // Cannot delete admin

        var result = await _users.DeleteOneAsync(u => u.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> ToggleUserActiveAsync(string id)
    {
        var user = await GetUserByIdAsync(id);
        if (user == null) return false;
        if (user.Role == UserRole.Admin) return false; // Cannot deactivate admin

        var update = Builders<User>.Update.Set(u => u.IsActive, !user.IsActive);
        await _users.UpdateOneAsync(u => u.Id == id, update);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(string userId, string currentPassword, string newPassword)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash)) return false;

        var update = Builders<User>.Update.Set(u => u.PasswordHash, BCrypt.Net.BCrypt.HashPassword(newPassword));
        await _users.UpdateOneAsync(u => u.Id == userId, update);
        return true;
    }

    // --- Password Reset ---

    public async Task<bool> RequestPasswordResetAsync(string email)
    {
        var user = await GetUserByEmailAsync(email);
        if (user == null || user.Role != UserRole.Admin) return false; // Only admin can reset

        var token = GenerateResetToken();
        var expiry = DateTime.UtcNow.AddHours(1);

        var update = Builders<User>.Update
            .Set(u => u.PasswordResetToken, token)
            .Set(u => u.PasswordResetExpiry, expiry);
        await _users.UpdateOneAsync(u => u.Id == user.Id, update);

        // Send reset email
        await SendPasswordResetEmailAsync(user.Email, user.Name, token);
        _logger.LogInformation("Password reset requested for {Email}", email);
        return true;
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        var user = await _users.Find(u =>
            u.PasswordResetToken == token &&
            u.PasswordResetExpiry > DateTime.UtcNow
        ).FirstOrDefaultAsync();

        if (user == null) return false;

        var update = Builders<User>.Update
            .Set(u => u.PasswordHash, BCrypt.Net.BCrypt.HashPassword(newPassword))
            .Set(u => u.PasswordResetToken, (string?)null)
            .Set(u => u.PasswordResetExpiry, (DateTime?)null);
        await _users.UpdateOneAsync(u => u.Id == user.Id, update);

        _logger.LogInformation("Password reset completed for {Email}", user.Email);
        return true;
    }

    private string GenerateResetToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private async Task SendPasswordResetEmailAsync(string email, string name, string token)
    {
        var subject = $"Password Reset - {_appSettings.CompanyName} POS";
        var htmlBody = $@"
            <div style='font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #1a1a2e;'>Password Reset</h2>
                <p>Hi {name},</p>
                <p>Your password reset code is:</p>
                <div style='background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;'>
                    <code style='font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1a1a2e;'>{token}</code>
                </div>
                <p>Copy this code and paste it on the reset password page.</p>
                <p style='color: #888; font-size: 13px;'>This code expires in 1 hour. If you didn't request this, ignore this email.</p>
                <p>— {_appSettings.CompanyName} POS</p>
            </div>";
        var textBody = $"Password Reset Code: {token}\n\nThis code expires in 1 hour.";

        try
        {
            await _emailService.SendResetEmailAsync(email, name, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            throw;
        }
    }
}
