using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly SettingsService _settingsService;

    public SettingsController(SettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<ActionResult<AppSettingsDocument>> Get()
    {
        var settings = await _settingsService.GetAsync();
        return Ok(settings);
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AppSettingsDocument>> Update([FromBody] AppSettingsDocument settings)
    {
        var updated = await _settingsService.UpdateAsync(settings);
        return Ok(updated);
    }

    /// <summary>
    /// Returns the list of configured shops. Available to all authenticated users.
    /// </summary>
    [HttpGet("shops")]
    public async Task<ActionResult<List<string>>> GetShops()
    {
        var settings = await _settingsService.GetAsync();
        return Ok(settings.Shops ?? new List<string>());
    }
}
