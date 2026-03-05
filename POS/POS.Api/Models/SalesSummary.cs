namespace POS.Api.Models;

public class SalesSummary
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal TotalSales { get; set; }
    public int TotalOrders { get; set; }
    public int TotalItems { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalTax { get; set; }
    public decimal AverageOrderValue { get; set; }
    public Dictionary<string, decimal> PaymentBreakdown { get; set; } = new();
    // EFT outstanding info
    public int EftOutstandingCount { get; set; }
    public decimal EftOutstandingTotal { get; set; }
    public int EftReceivedCount { get; set; }
    public decimal EftReceivedTotal { get; set; }
}
