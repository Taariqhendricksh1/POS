using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace POS.Api.Models;

public class StockTransfer
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("transferNumber")]
    public string TransferNumber { get; set; } = string.Empty;

    [BsonElement("recipientCompany")]
    public string RecipientCompany { get; set; } = string.Empty;

    [BsonElement("recipientContact")]
    public string? RecipientContact { get; set; }

    [BsonElement("recipientPhone")]
    public string? RecipientPhone { get; set; }

    [BsonElement("recipientEmail")]
    public string? RecipientEmail { get; set; }

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("items")]
    public List<StockTransferItem> Items { get; set; } = new();

    [BsonElement("totalItems")]
    public int TotalItems { get; set; }

    [BsonElement("totalQuantity")]
    public int TotalQuantity { get; set; }

    [BsonElement("status")]
    public TransferStatus Status { get; set; } = TransferStatus.Draft;

    [BsonElement("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }
}

public class StockTransferItem
{
    [BsonElement("productId")]
    public string ProductId { get; set; } = string.Empty;

    [BsonElement("barcode")]
    public string Barcode { get; set; } = string.Empty;

    [BsonElement("productName")]
    public string ProductName { get; set; } = string.Empty;

    [BsonElement("shop")]
    public string Shop { get; set; } = string.Empty;

    [BsonElement("quantity")]
    public int Quantity { get; set; } = 1;

    [BsonElement("costPrice")]
    public decimal CostPrice { get; set; }

    [BsonElement("sellingPrice")]
    public decimal SellingPrice { get; set; }
}

public enum TransferStatus
{
    Draft = 0,
    Completed = 1,
    Cancelled = 2
}
