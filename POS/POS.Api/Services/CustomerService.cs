using Microsoft.Extensions.Options;
using MongoDB.Driver;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class CustomerService
{
    private readonly IMongoCollection<Customer> _customers;

    public CustomerService(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _customers = database.GetCollection<Customer>("customers");

        // Create index on email for fast lookups
        var emailIndex = Builders<Customer>.IndexKeys.Ascending(c => c.Email);
        _customers.Indexes.CreateOne(new CreateIndexModel<Customer>(emailIndex));

        // Text-like index on name fields for search
        var nameIndex = Builders<Customer>.IndexKeys
            .Ascending(c => c.FirstName)
            .Ascending(c => c.LastName);
        _customers.Indexes.CreateOne(new CreateIndexModel<Customer>(nameIndex));
    }

    public async Task<List<Customer>> GetAllAsync()
    {
        return await _customers.Find(c => c.IsActive)
            .SortBy(c => c.FirstName).ThenBy(c => c.LastName)
            .ToListAsync();
    }

    public async Task<Customer?> GetByIdAsync(string id) =>
        await _customers.Find(c => c.Id == id).FirstOrDefaultAsync();

    public async Task<Customer?> GetByEmailAsync(string email) =>
        await _customers.Find(c => c.Email.ToLower() == email.ToLower()).FirstOrDefaultAsync();

    public async Task<List<Customer>> SearchAsync(string query)
    {
        var filter = Builders<Customer>.Filter.And(
            Builders<Customer>.Filter.Eq(c => c.IsActive, true),
            Builders<Customer>.Filter.Or(
                Builders<Customer>.Filter.Regex(c => c.FirstName, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                Builders<Customer>.Filter.Regex(c => c.LastName, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                Builders<Customer>.Filter.Regex(c => c.Email, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                Builders<Customer>.Filter.Regex(c => c.CellNumber, new MongoDB.Bson.BsonRegularExpression(query, "i"))
            )
        );
        return await _customers.Find(filter).Limit(20).ToListAsync();
    }

    public async Task<Customer> CreateAsync(Customer customer)
    {
        customer.CreatedAt = DateTime.UtcNow;
        customer.UpdatedAt = DateTime.UtcNow;
        await _customers.InsertOneAsync(customer);
        return customer;
    }

    public async Task<bool> UpdateAsync(string id, Customer customer)
    {
        customer.UpdatedAt = DateTime.UtcNow;
        customer.Id = id;
        var result = await _customers.ReplaceOneAsync(c => c.Id == id, customer);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeactivateAsync(string id)
    {
        var update = Builders<Customer>.Update
            .Set(c => c.IsActive, false)
            .Set(c => c.UpdatedAt, DateTime.UtcNow);
        var result = await _customers.UpdateOneAsync(c => c.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _customers.DeleteOneAsync(c => c.Id == id);
        return result.DeletedCount > 0;
    }
}
