using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace POS.Api.Services;

public class KeepAliveService : BackgroundService
{
    private readonly ILogger<KeepAliveService> _logger;
    private readonly IConfiguration _configuration;
    private static readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(30) };

    public KeepAliveService(ILogger<KeepAliveService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait for the app to fully start before pinging
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        // Use external URL so Render counts it as real traffic
        var selfUrl = Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL");
        if (string.IsNullOrEmpty(selfUrl))
        {
            // Fallback for local dev
            var port = Environment.GetEnvironmentVariable("PORT") ?? "5100";
            selfUrl = $"http://localhost:{port}";
        }
        var healthUrl = $"{selfUrl}/api/health";

        _logger.LogInformation("KeepAlive service started — pinging {Url} every 5 minutes", healthUrl);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var response = await _httpClient.GetAsync(healthUrl, stoppingToken);
                _logger.LogDebug("KeepAlive ping: {StatusCode}", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("KeepAlive ping failed: {Error}", ex.Message);
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
