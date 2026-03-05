using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace POS.Api.Models;

public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("invoiceNumber")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [BsonElement("clientEmail")]
    public string ClientEmail { get; set; } = string.Empty;

    [BsonElement("clientName")]
    public string ClientName { get; set; } = string.Empty;

    [BsonElement("customerId")]
    public string? CustomerId { get; set; }

    [BsonElement("clientPhone")]
    public string? ClientPhone { get; set; }

    [BsonElement("items")]
    public List<OrderItem> Items { get; set; } = new();

    [BsonElement("subtotal")]
    public decimal Subtotal { get; set; }

    [BsonElement("discountTotal")]
    public decimal DiscountTotal { get; set; }

    [BsonElement("taxRate")]
    public decimal TaxRate { get; set; } = 15; // VAT percentage

    [BsonElement("taxAmount")]
    public decimal TaxAmount { get; set; }

    [BsonElement("total")]
    public decimal Total { get; set; }

    [BsonElement("paymentMethod")]
    public PaymentMethod PaymentMethod { get; set; }

    [BsonElement("status")]
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [BsonElement("emailSent")]
    public bool? EmailSent { get; set; }

    [BsonElement("emailError")]
    public string? EmailError { get; set; }

    [BsonElement("eftPaymentReceived")]
    public bool EftPaymentReceived { get; set; }

    [BsonElement("eftPaymentReceivedAt")]
    public DateTime? EftPaymentReceivedAt { get; set; }
}

public class OrderItem
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

    [BsonElement("unitPrice")]
    public decimal UnitPrice { get; set; }

    [BsonElement("discountPercentage")]
    public decimal DiscountPercentage { get; set; }

    [BsonElement("isProductDiscount")]
    public bool IsProductDiscount { get; set; }

    [BsonElement("effectivePrice")]
    public decimal EffectivePrice { get; set; }

    [BsonElement("lineTotal")]
    public decimal LineTotal { get; set; }
}

public enum PaymentMethod
{
    Cash = 0,
    Card = 1,
    EFT = 2,
    Other = 3
}

public enum OrderStatus
{
    Pending = 0,
    Completed = 1,
    Cancelled = 2,
    Refunded = 3
}
