using Microsoft.Extensions.Options;
using MongoDB.Driver;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class SettingsService
{
    private readonly IMongoCollection<AppSettingsDocument> _settings;
    private readonly AppSettings _defaults;

    public SettingsService(IOptions<MongoDbSettings> dbSettings, IOptions<AppSettings> appDefaults)
    {
        var client = new MongoClient(dbSettings.Value.ConnectionString);
        var database = client.GetDatabase(dbSettings.Value.DatabaseName);
        _settings = database.GetCollection<AppSettingsDocument>("settings");
        _defaults = appDefaults.Value;
    }

    /// <summary>
    /// Gets the current settings from the database, seeding defaults from appsettings.json if none exist.
    /// </summary>
    public async Task<AppSettingsDocument> GetAsync()
    {
        var settings = await _settings.Find(_ => true).FirstOrDefaultAsync();
        if (settings != null) return settings;

        // Seed from appsettings.json defaults
        settings = new AppSettingsDocument
        {
            CompanyName = _defaults.CompanyName,
            CompanyAddress = _defaults.CompanyAddress,
            CompanyPhone = _defaults.CompanyPhone,
            CompanyEmail = _defaults.CompanyEmail,
            DefaultTaxRate = _defaults.DefaultTaxRate,
            CurrencySymbol = _defaults.CurrencySymbol,
            InvoicePrefix = _defaults.InvoicePrefix,
            UpdatedAt = DateTime.UtcNow
        };
        await _settings.InsertOneAsync(settings);
        return settings;
    }

    /// <summary>
    /// Updates the settings in the database.
    /// </summary>
    public async Task<AppSettingsDocument> UpdateAsync(AppSettingsDocument updated)
    {
        var existing = await GetAsync();

        var update = Builders<AppSettingsDocument>.Update
            .Set(s => s.CompanyName, updated.CompanyName)
            .Set(s => s.CompanyAddress, updated.CompanyAddress)
            .Set(s => s.CompanyPhone, updated.CompanyPhone)
            .Set(s => s.CompanyEmail, updated.CompanyEmail)
            .Set(s => s.DefaultTaxRate, updated.DefaultTaxRate)
            .Set(s => s.CurrencySymbol, updated.CurrencySymbol)
            .Set(s => s.InvoicePrefix, updated.InvoicePrefix)
            .Set(s => s.BankName, updated.BankName)
            .Set(s => s.BankAccountName, updated.BankAccountName)
            .Set(s => s.BankAccountNumber, updated.BankAccountNumber)
            .Set(s => s.BankBranchCode, updated.BankBranchCode)
            .Set(s => s.BankAccountType, updated.BankAccountType)
            .Set(s => s.BankReference, updated.BankReference)
            .Set(s => s.UpdatedAt, DateTime.UtcNow);

        await _settings.UpdateOneAsync(s => s.Id == existing.Id, update);
        return await GetAsync();
    }
}
