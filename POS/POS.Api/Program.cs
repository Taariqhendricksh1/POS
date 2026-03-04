using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using POS.Api.Configuration;
using POS.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Use PORT env var if set (Render provides this)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5100";
builder.WebHost.UseUrls($"http://+:{port}");

// Configuration
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDb"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("App"));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

// Services
builder.Services.AddSingleton<ProductService>();
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<OrderService>();
builder.Services.AddSingleton<CustomerService>();
builder.Services.AddSingleton<AuthService>();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "POS-SuperSecret-JWT-Key-2024-ChangeThisInProduction-MinLength32!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "POS.Api",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "POS.Frontend",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization();

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS for React dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // Allow any origin for mobile LAN testing
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Seed admin user
using (var scope = app.Services.CreateScope())
{
    var authService = scope.ServiceProvider.GetRequiredService<AuthService>();
    var adminEmail = builder.Configuration["AdminSeed:Email"] ?? "taariq_h@icloud.com";
    var adminPassword = builder.Configuration["AdminSeed:Password"] ?? "admin123";
    await authService.SeedAdminAsync(adminEmail, adminPassword);
}

app.Run();
