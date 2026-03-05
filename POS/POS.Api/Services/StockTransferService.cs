using Microsoft.Extensions.Options;
using MongoDB.Driver;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class StockTransferService
{
    private readonly IMongoCollection<StockTransfer> _transfers;
    private readonly IMongoCollection<InvoiceCounter> _counters;
    private readonly ProductService _productService;
    private readonly ILogger<StockTransferService> _logger;

    public StockTransferService(
        IOptions<MongoDbSettings> dbSettings,
        ProductService productService,
        ILogger<StockTransferService> logger)
    {
        var client = new MongoClient(dbSettings.Value.ConnectionString);
        var database = client.GetDatabase(dbSettings.Value.DatabaseName);
        _transfers = database.GetCollection<StockTransfer>("stockTransfers");
        _counters = database.GetCollection<InvoiceCounter>("counters");
        _productService = productService;
        _logger = logger;
    }

    public async Task<string> GenerateTransferNumberAsync()
    {
        var filter = Builders<InvoiceCounter>.Filter.Eq(c => c.Name, "stockTransfer");
        var update = Builders<InvoiceCounter>.Update.Inc(c => c.Sequence, 1);
        var options = new FindOneAndUpdateOptions<InvoiceCounter>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };
        var counter = await _counters.FindOneAndUpdateAsync(filter, update, options);
        return $"TRF-{counter.Sequence:D6}";
    }

    public async Task<StockTransfer> CreateTransferAsync(string recipientCompany, string? recipientContact, string? recipientPhone, string? recipientEmail, string? notes, string createdBy)
    {
        var transferNumber = await GenerateTransferNumberAsync();
        var transfer = new StockTransfer
        {
            TransferNumber = transferNumber,
            RecipientCompany = recipientCompany,
            RecipientContact = recipientContact,
            RecipientPhone = recipientPhone,
            RecipientEmail = recipientEmail,
            Notes = notes,
            CreatedBy = createdBy,
            Status = TransferStatus.Draft
        };
        await _transfers.InsertOneAsync(transfer);
        return transfer;
    }

    public async Task<StockTransfer?> AddItemAsync(string transferId, string barcode)
    {
        var transfer = await _transfers.Find(t => t.Id == transferId).FirstOrDefaultAsync();
        if (transfer == null || transfer.Status != TransferStatus.Draft) return null;

        var product = await _productService.GetByBarcodeAsync(barcode);
        if (product == null || !product.IsActive) return null;

        var existingItem = transfer.Items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existingItem != null)
        {
            existingItem.Quantity++;
        }
        else
        {
            transfer.Items.Add(new StockTransferItem
            {
                ProductId = product.Id!,
                Barcode = product.Barcode,
                ProductName = product.Name,
                Shop = product.Shop,
                Quantity = 1,
                CostPrice = product.CostPrice,
                SellingPrice = product.SellingPrice
            });
        }

        RecalculateTotals(transfer);
        await _transfers.ReplaceOneAsync(t => t.Id == transferId, transfer);
        return transfer;
    }

    public async Task<StockTransfer?> UpdateItemQuantityAsync(string transferId, string productId, int quantity)
    {
        var transfer = await _transfers.Find(t => t.Id == transferId).FirstOrDefaultAsync();
        if (transfer == null || transfer.Status != TransferStatus.Draft) return null;

        if (quantity <= 0)
        {
            transfer.Items.RemoveAll(i => i.ProductId == productId);
        }
        else
        {
            var item = transfer.Items.FirstOrDefault(i => i.ProductId == productId);
            if (item == null) return null;
            item.Quantity = quantity;
        }

        RecalculateTotals(transfer);
        await _transfers.ReplaceOneAsync(t => t.Id == transferId, transfer);
        return transfer;
    }

    public async Task<StockTransfer?> RemoveItemAsync(string transferId, string productId)
    {
        return await UpdateItemQuantityAsync(transferId, productId, 0);
    }

    public async Task<StockTransfer?> CompleteTransferAsync(string transferId)
    {
        var transfer = await _transfers.Find(t => t.Id == transferId).FirstOrDefaultAsync();
        if (transfer == null || transfer.Status != TransferStatus.Draft) return null;
        if (!transfer.Items.Any()) return null;

        // Deduct stock for each item
        foreach (var item in transfer.Items)
        {
            var deducted = await _productService.DeductStockAsync(item.ProductId, item.Quantity);
            if (!deducted)
            {
                _logger.LogError("Stock deduction failed for product {ProductId} (qty: {Qty}) in transfer {TransferNumber}",
                    item.ProductId, item.Quantity, transfer.TransferNumber);
                return null;
            }
        }

        transfer.Status = TransferStatus.Completed;
        transfer.CompletedAt = DateTime.UtcNow;
        await _transfers.ReplaceOneAsync(t => t.Id == transferId, transfer);

        _logger.LogInformation("Stock transfer {TransferNumber} completed — {TotalItems} items, {TotalQuantity} units transferred to {Recipient}",
            transfer.TransferNumber, transfer.TotalItems, transfer.TotalQuantity, transfer.RecipientCompany);

        return transfer;
    }

    public async Task<StockTransfer?> CancelTransferAsync(string transferId)
    {
        var transfer = await _transfers.Find(t => t.Id == transferId).FirstOrDefaultAsync();
        if (transfer == null) return null;

        transfer.Status = TransferStatus.Cancelled;
        await _transfers.ReplaceOneAsync(t => t.Id == transferId, transfer);
        return transfer;
    }

    public async Task<StockTransfer?> GetByIdAsync(string id) =>
        await _transfers.Find(t => t.Id == id).FirstOrDefaultAsync();

    public async Task<List<StockTransfer>> GetRecentAsync(int limit = 50) =>
        await _transfers.Find(_ => true).SortByDescending(t => t.CreatedAt).Limit(limit).ToListAsync();

    public async Task<bool> DeleteTransferAsync(string transferId)
    {
        var transfer = await _transfers.Find(t => t.Id == transferId).FirstOrDefaultAsync();
        if (transfer == null) return false;
        if (transfer.Status == TransferStatus.Completed) return false;

        var result = await _transfers.DeleteOneAsync(t => t.Id == transferId);
        return result.DeletedCount > 0;
    }

    private void RecalculateTotals(StockTransfer transfer)
    {
        transfer.TotalItems = transfer.Items.Count;
        transfer.TotalQuantity = transfer.Items.Sum(i => i.Quantity);
    }
}
