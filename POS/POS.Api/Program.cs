using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
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
builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<ProductService>();
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<OrderService>();
builder.Services.AddSingleton<StockTransferService>();
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
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "POS API",
        Version = "v1",
        Description = "Point of Sale API for Kanje Krafts & Kreations"
    });

    // JWT Bearer auth
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

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

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "POS API v1");
});

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Unauthenticated health/wake-up endpoint
app.MapGet("/api/health", () => Results.Ok(new { message = "I am awake" }));

// Seed admin user
using (var scope = app.Services.CreateScope())
{
    var authService = scope.ServiceProvider.GetRequiredService<AuthService>();
    var adminEmail = builder.Configuration["AdminSeed:Email"] ?? "taariq_h@icloud.com";
    var adminPassword = builder.Configuration["AdminSeed:Password"] ?? "admin123";
    await authService.SeedAdminAsync(adminEmail, adminPassword);
}

app.Run();
