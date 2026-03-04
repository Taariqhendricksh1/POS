using Microsoft.Extensions.Options;
using MongoDB.Driver;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class OrderService
{
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<InvoiceCounter> _counters;
    private readonly ProductService _productService;
    private readonly EmailService _emailService;
    private readonly AppSettings _appSettings;

    public OrderService(
        IOptions<MongoDbSettings> dbSettings,
        IOptions<AppSettings> appSettings,
        ProductService productService,
        EmailService emailService)
    {
        var client = new MongoClient(dbSettings.Value.ConnectionString);
        var database = client.GetDatabase(dbSettings.Value.DatabaseName);
        _orders = database.GetCollection<Order>("orders");
        _counters = database.GetCollection<InvoiceCounter>("counters");
        _productService = productService;
        _emailService = emailService;
        _appSettings = appSettings.Value;
    }

    public async Task<string> GenerateInvoiceNumberAsync()
    {
        var filter = Builders<InvoiceCounter>.Filter.Eq(c => c.Name, "invoice");
        var update = Builders<InvoiceCounter>.Update.Inc(c => c.Sequence, 1);
        var options = new FindOneAndUpdateOptions<InvoiceCounter>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };
        var counter = await _counters.FindOneAndUpdateAsync(filter, update, options);
        return $"{_appSettings.InvoicePrefix}-{counter.Sequence:D6}";
    }

    public async Task<Order> CreateOrderAsync(string clientEmail, string clientName, string? customerId = null, string? clientPhone = null)
    {
        var invoiceNumber = await GenerateInvoiceNumberAsync();
        var order = new Order
        {
            InvoiceNumber = invoiceNumber,
            ClientEmail = clientEmail,
            ClientName = clientName,
            CustomerId = customerId,
            ClientPhone = clientPhone,
            TaxRate = _appSettings.DefaultTaxRate,
            Status = OrderStatus.Pending
        };
        await _orders.InsertOneAsync(order);
        return order;
    }

    public async Task<Order?> AddItemToOrderAsync(string orderId, string barcode)
    {
        var order = await _orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null || order.Status != OrderStatus.Pending) return null;

        var product = await _productService.GetByBarcodeAsync(barcode);
        if (product == null || !product.IsActive) return null;

        if (product.QuantityInStock <= 0) return null;

        // Check if item already exists in order
        var existingItem = order.Items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existingItem != null)
        {
            existingItem.Quantity++;
            existingItem.LineTotal = existingItem.Quantity * existingItem.EffectivePrice;
        }
        else
        {
            var effectivePrice = product.DiscountPercentage > 0
                ? product.SellingPrice * (1 - product.DiscountPercentage / 100)
                : product.SellingPrice;

            order.Items.Add(new OrderItem
            {
                ProductId = product.Id!,
                Barcode = product.Barcode,
                ProductName = product.Name,
                Shop = product.Shop,
                Quantity = 1,
                UnitPrice = product.SellingPrice,
                DiscountPercentage = product.DiscountPercentage,
                EffectivePrice = effectivePrice,
                LineTotal = effectivePrice
            });
        }

        RecalculateTotals(order);
        await _orders.ReplaceOneAsync(o => o.Id == orderId, order);
        return order;
    }

    public async Task<Order?> UpdateItemQuantityAsync(string orderId, string productId, int quantity)
    {
        var order = await _orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null || order.Status != OrderStatus.Pending) return null;

        if (quantity <= 0)
        {
            order.Items.RemoveAll(i => i.ProductId == productId);
        }
        else
        {
            var item = order.Items.FirstOrDefault(i => i.ProductId == productId);
            if (item == null) return null;
            item.Quantity = quantity;
            item.LineTotal = quantity * item.EffectivePrice;
        }

        RecalculateTotals(order);
        await _orders.ReplaceOneAsync(o => o.Id == orderId, order);
        return order;
    }

    public async Task<Order?> RemoveItemFromOrderAsync(string orderId, string productId)
    {
        return await UpdateItemQuantityAsync(orderId, productId, 0);
    }

    public async Task<Order?> CompleteOrderAsync(string orderId, PaymentMethod paymentMethod)
    {
        var order = await _orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null || order.Status != OrderStatus.Pending) return null;
        if (!order.Items.Any()) return null;

        // Deduct stock for each item
        foreach (var item in order.Items)
        {
            var deducted = await _productService.DeductStockAsync(item.ProductId, item.Quantity);
            if (!deducted)
            {
                // If stock deduction fails, return null (insufficient stock)
                return null;
            }
        }

        order.PaymentMethod = paymentMethod;
        order.Status = OrderStatus.Completed;
        order.CompletedAt = DateTime.UtcNow;

        await _orders.ReplaceOneAsync(o => o.Id == orderId, order);

        // Send invoice email (fire and forget)
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendInvoiceEmailAsync(order);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send invoice email: {ex.Message}");
            }
        });

        return order;
    }

    public async Task<Order?> CancelOrderAsync(string orderId)
    {
        var order = await _orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null) return null;

        order.Status = OrderStatus.Cancelled;
        await _orders.ReplaceOneAsync(o => o.Id == orderId, order);
        return order;
    }

    public async Task<bool> DeleteOrderAsync(string orderId)
    {
        var order = await _orders.Find(o => o.Id == orderId).FirstOrDefaultAsync();
        if (order == null) return false;
        if (order.Status == OrderStatus.Completed) return false; // Cannot delete completed orders

        var result = await _orders.DeleteOneAsync(o => o.Id == orderId);
        return result.DeletedCount > 0;
    }

    public async Task<Order?> GetByIdAsync(string id) =>
        await _orders.Find(o => o.Id == id).FirstOrDefaultAsync();

    public async Task<Order?> GetByInvoiceNumberAsync(string invoiceNumber) =>
        await _orders.Find(o => o.InvoiceNumber == invoiceNumber).FirstOrDefaultAsync();

    public async Task<List<Order>> GetRecentOrdersAsync(int limit = 50) =>
        await _orders.Find(_ => true).SortByDescending(o => o.CreatedAt).Limit(limit).ToListAsync();

    public async Task<List<Order>> GetOrdersByDateRangeAsync(DateTime from, DateTime to) =>
        await _orders.Find(o => o.CreatedAt >= from && o.CreatedAt <= to)
            .SortByDescending(o => o.CreatedAt).ToListAsync();

    private void RecalculateTotals(Order order)
    {
        order.Subtotal = order.Items.Sum(i => i.Quantity * i.UnitPrice);
        order.DiscountTotal = order.Items.Sum(i => i.Quantity * (i.UnitPrice - i.EffectivePrice));
        var taxableAmount = order.Subtotal - order.DiscountTotal;
        order.TaxAmount = Math.Round(taxableAmount * order.TaxRate / (100 + order.TaxRate), 2); // VAT inclusive
        order.Total = taxableAmount;
    }
}
