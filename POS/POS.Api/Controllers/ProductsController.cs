using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _productService;

    public ProductsController(ProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll([FromQuery] string? shop = null)
    {
        var products = await _productService.GetAllAsync(shop);
        return Ok(products);
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<Product>>> GetActive([FromQuery] string? shop = null)
    {
        var products = await _productService.GetActiveAsync(shop);
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(string id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<ActionResult<Product>> GetByBarcode(string barcode)
    {
        var product = await _productService.GetByBarcodeAsync(barcode);
        if (product == null) return NotFound(new { message = "Product not found for this barcode" });
        return Ok(product);
    }

    [HttpGet("search/{query}")]
    public async Task<ActionResult<List<Product>>> Search(string query, [FromQuery] string? shop = null)
    {
        var products = await _productService.SearchAsync(query, shop);
        return Ok(products);
    }

    [HttpGet("low-stock")]
    public async Task<ActionResult<List<Product>>> GetLowStock([FromQuery] string? shop = null)
    {
        var products = await _productService.GetLowStockAsync(shop);
        return Ok(products);
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStats>> GetDashboardStats([FromQuery] string? shop = null)
    {
        var stats = await _productService.GetDashboardStatsAsync(shop);
        return Ok(stats);
    }

    [HttpGet("shops")]
    public async Task<ActionResult<List<string>>> GetShops()
    {
        var shops = await _productService.GetDistinctShopsAsync();
        return Ok(shops);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] Product product)
    {
        // Check if barcode already exists
        var existing = await _productService.GetByBarcodeAsync(product.Barcode);
        if (existing != null)
            return Conflict(new { message = "A product with this barcode already exists", product = existing });

        var created = await _productService.CreateAsync(product);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Product>> Update(string id, [FromBody] Product product)
    {
        var existing = await _productService.GetByIdAsync(id);
        if (existing == null) return NotFound();

        product.Id = id;
        product.CreatedAt = existing.CreatedAt;
        var updated = await _productService.UpdateAsync(id, product);
        if (!updated) return BadRequest();

        return Ok(product);
    }

    [HttpPatch("{id}/stock")]
    public async Task<ActionResult> UpdateStock(string id, [FromBody] StockUpdateRequest request)
    {
        var updated = await _productService.UpdateStockAsync(id, request.QuantityChange);
        if (!updated) return NotFound();
        return Ok(new { message = "Stock updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _productService.DeleteAsync(id);
        if (!deleted) return NotFound();
        return Ok(new { message = "Product deactivated successfully" });
    }
}

public class StockUpdateRequest
{
    public int QuantityChange { get; set; }
}
