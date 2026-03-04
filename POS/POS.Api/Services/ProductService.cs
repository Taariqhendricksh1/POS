using Microsoft.Extensions.Options;
using MongoDB.Driver;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class ProductService
{
    private readonly IMongoCollection<Product> _products;

    public ProductService(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _products = database.GetCollection<Product>("products");

        // Create index on barcode for fast lookups
        var indexKeys = Builders<Product>.IndexKeys.Ascending(p => p.Barcode);
        _products.Indexes.CreateOne(new CreateIndexModel<Product>(indexKeys, new CreateIndexOptions { Unique = true }));
    }

    public async Task<List<Product>> GetAllAsync(string? shop = null)
    {
        var filter = shop != null
            ? Builders<Product>.Filter.Eq(p => p.Shop, shop)
            : Builders<Product>.Filter.Empty;
        return await _products.Find(filter).SortByDescending(p => p.UpdatedAt).ToListAsync();
    }

    public async Task<List<Product>> GetActiveAsync(string? shop = null)
    {
        var builder = Builders<Product>.Filter;
        var filter = builder.Eq(p => p.IsActive, true);
        if (shop != null)
            filter = builder.And(filter, builder.Eq(p => p.Shop, shop));
        return await _products.Find(filter).SortBy(p => p.Name).ToListAsync();
    }

    public async Task<Product?> GetByIdAsync(string id) =>
        await _products.Find(p => p.Id == id).FirstOrDefaultAsync();

    public async Task<Product?> GetByBarcodeAsync(string barcode) =>
        await _products.Find(p => p.Barcode == barcode).FirstOrDefaultAsync();

    public async Task<List<Product>> SearchAsync(string query, string? shop = null)
    {
        var searchFilter = Builders<Product>.Filter.Or(
            Builders<Product>.Filter.Regex(p => p.Name, new MongoDB.Bson.BsonRegularExpression(query, "i")),
            Builders<Product>.Filter.Regex(p => p.Barcode, new MongoDB.Bson.BsonRegularExpression(query, "i")),
            Builders<Product>.Filter.Regex(p => p.Sku, new MongoDB.Bson.BsonRegularExpression(query, "i")),
            Builders<Product>.Filter.Regex(p => p.Category, new MongoDB.Bson.BsonRegularExpression(query, "i"))
        );
        if (shop != null)
            searchFilter = Builders<Product>.Filter.And(searchFilter, Builders<Product>.Filter.Eq(p => p.Shop, shop));
        return await _products.Find(searchFilter).ToListAsync();
    }

    public async Task<Product> CreateAsync(Product product)
    {
        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;
        await _products.InsertOneAsync(product);
        return product;
    }

    public async Task<bool> UpdateAsync(string id, Product product)
    {
        product.UpdatedAt = DateTime.UtcNow;
        var result = await _products.ReplaceOneAsync(p => p.Id == id, product);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateStockAsync(string id, int quantityChange)
    {
        var update = Builders<Product>.Update
            .Inc(p => p.QuantityInStock, quantityChange)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);
        var result = await _products.UpdateOneAsync(p => p.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeductStockAsync(string productId, int quantity)
    {
        var filter = Builders<Product>.Filter.And(
            Builders<Product>.Filter.Eq(p => p.Id, productId),
            Builders<Product>.Filter.Gte(p => p.QuantityInStock, quantity)
        );
        var update = Builders<Product>.Update
            .Inc(p => p.QuantityInStock, -quantity)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);
        var result = await _products.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeactivateAsync(string id)
    {
        var update = Builders<Product>.Update
            .Set(p => p.IsActive, false)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);
        var result = await _products.UpdateOneAsync(p => p.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> ActivateAsync(string id)
    {
        var update = Builders<Product>.Update
            .Set(p => p.IsActive, true)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);
        var result = await _products.UpdateOneAsync(p => p.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> HardDeleteAsync(string id)
    {
        var result = await _products.DeleteOneAsync(p => p.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<List<Product>> GetLowStockAsync(string? shop = null)
    {
        var builder = Builders<Product>.Filter;
        var filter = builder.And(
            builder.Eq(p => p.IsActive, true),
            builder.Where(p => p.QuantityInStock <= p.ReorderLevel)
        );
        if (shop != null)
            filter = builder.And(filter, builder.Eq(p => p.Shop, shop));
        return await _products.Find(filter).SortBy(p => p.QuantityInStock).ToListAsync();
    }

    public async Task<DashboardStats> GetDashboardStatsAsync(string? shop = null)
    {
        var builder = Builders<Product>.Filter;
        var filter = builder.Eq(p => p.IsActive, true);
        if (shop != null)
            filter = builder.And(filter, builder.Eq(p => p.Shop, shop));
        var allProducts = await _products.Find(filter).ToListAsync();
        return new DashboardStats
        {
            TotalProducts = allProducts.Count,
            TotalStockValue = allProducts.Sum(p => p.CostPrice * p.QuantityInStock),
            TotalRetailValue = allProducts.Sum(p => p.SellingPrice * p.QuantityInStock),
            LowStockCount = allProducts.Count(p => p.QuantityInStock <= p.ReorderLevel),
            OutOfStockCount = allProducts.Count(p => p.QuantityInStock == 0)
        };
    }

    public async Task<List<string>> GetDistinctShopsAsync()
    {
        var shops = await _products.DistinctAsync(p => p.Shop, p => p.IsActive && p.Shop != null && p.Shop != "");
        return await shops.ToListAsync();
    }
}

public class DashboardStats
{
    public int TotalProducts { get; set; }
    public decimal TotalStockValue { get; set; }
    public decimal TotalRetailValue { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
}
