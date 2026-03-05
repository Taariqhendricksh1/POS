using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace POS.Api.Models;

public class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("barcode")]
    public string Barcode { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("shop")]
    public string Shop { get; set; } = string.Empty;

    [BsonElement("costPrice")]
    public decimal CostPrice { get; set; }

    [BsonElement("sellingPrice")]
    public decimal SellingPrice { get; set; }

    [BsonElement("discountPercentage")]
    public decimal DiscountPercentage { get; set; }

    [BsonElement("quantityInStock")]
    public int QuantityInStock { get; set; }

    [BsonElement("reorderLevel")]
    public int ReorderLevel { get; set; } = 10;

    [BsonElement("sku")]
    public string Sku { get; set; } = string.Empty;

    [BsonElement("imageUrl")]
    public string? ImageUrl { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonIgnore]
    public decimal EffectivePrice =>
        DiscountPercentage > 0
            ? SellingPrice * (1 - DiscountPercentage / 100)
            : SellingPrice;

    [BsonIgnore]
    public decimal ProfitMargin =>
        SellingPrice > 0
            ? ((EffectivePrice - CostPrice) / EffectivePrice) * 100
            : 0;

    [BsonIgnore]
    public bool IsLowStock => ReorderLevel > 0 && QuantityInStock <= ReorderLevel;
}
