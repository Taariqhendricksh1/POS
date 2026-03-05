using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace POS.Api.Models;

public class AppSettingsDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("companyName")]
    public string CompanyName { get; set; } = "My POS Store";

    [BsonElement("companyAddress")]
    public string CompanyAddress { get; set; } = string.Empty;

    [BsonElement("companyPhone")]
    public string CompanyPhone { get; set; } = string.Empty;

    [BsonElement("companyEmail")]
    public string CompanyEmail { get; set; } = string.Empty;

    [BsonElement("defaultTaxRate")]
    public decimal DefaultTaxRate { get; set; } = 15;

    [BsonElement("currencySymbol")]
    public string CurrencySymbol { get; set; } = "R";

    [BsonElement("invoicePrefix")]
    public string InvoicePrefix { get; set; } = "INV";

    // Bank details for EFT payments
    [BsonElement("bankName")]
    public string BankName { get; set; } = string.Empty;

    [BsonElement("bankAccountName")]
    public string BankAccountName { get; set; } = string.Empty;

    [BsonElement("bankAccountNumber")]
    public string BankAccountNumber { get; set; } = string.Empty;

    [BsonElement("bankBranchCode")]
    public string BankBranchCode { get; set; } = string.Empty;

    [BsonElement("bankAccountType")]
    public string BankAccountType { get; set; } = string.Empty;

    [BsonElement("bankReference")]
    public string BankReference { get; set; } = string.Empty;

    // Shop locations
    [BsonElement("shops")]
    public List<string> Shops { get; set; } = new();

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
