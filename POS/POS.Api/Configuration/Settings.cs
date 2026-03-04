namespace POS.Api.Configuration;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
}

public class EmailSettings
{
    public string SmtpServer { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;
    public string ApiKey { get; set; } = string.Empty; // Brevo HTTP API key (preferred over SMTP on Render)
}

public class AppSettings
{
    public string CompanyName { get; set; } = "My POS Store";
    public string CompanyAddress { get; set; } = string.Empty;
    public string CompanyPhone { get; set; } = string.Empty;
    public string CompanyEmail { get; set; } = string.Empty;
    public decimal DefaultTaxRate { get; set; } = 15;
    public string CurrencySymbol { get; set; } = "R";
    public string InvoicePrefix { get; set; } = "INV";
}
