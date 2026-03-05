namespace POS.Api.Models;

public class AddItemResult
{
    public bool Success { get; set; }
    public Order? Order { get; set; }
    public string? ErrorCode { get; set; } // "NOT_FOUND", "OUT_OF_STOCK", "ORDER_INVALID"
    public Product? Product { get; set; } // Included when out of stock so frontend can display details

    public static AddItemResult Ok(Order order) => new() { Success = true, Order = order };
    public static AddItemResult OrderInvalid() => new() { ErrorCode = "ORDER_INVALID" };
    public static AddItemResult NotFound() => new() { ErrorCode = "NOT_FOUND" };
    public static AddItemResult OutOfStock(Product product) => new() { ErrorCode = "OUT_OF_STOCK", Product = product };
}
